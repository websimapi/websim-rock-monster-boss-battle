import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Howl } from 'howler';
import { Player } from './player.js';
import { Boss } from './boss.js';
import { BattleArena } from './arena.js';

// Game state
let gameActive = true;
let player, boss, arena;
let camera, scene, renderer, controls;
let lastTime = 0;

// Sound effects
const sounds = {
    bgm: new Howl({
        src: ['bgm.mp3'],
        loop: true,
        volume: 0.5
    }),
    playerHit: new Howl({ src: ['player_hit.mp3'], volume: 0.5 }),
    bossHit: new Howl({ src: ['boss_hit.mp3'], volume: 0.5 }),
    warning: new Howl({ src: ['warning.mp3'], volume: 0.5 }),
    victory: new Howl({ src: ['victory.mp3'], volume: 0.7 }),
    defeat: new Howl({ src: ['defeat.mp3'], volume: 0.7 })
};

// UI Elements
const playerHealthFill = document.getElementById('playerHealthFill');
const bossHealthFill = document.getElementById('bossHealthFill');
const gameOverScreen = document.getElementById('gameOver');
const endMessage = document.getElementById('endMessage');
const restartButton = document.getElementById('restartButton');

// Input handling
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
    shift: false
};

function init() {
    // Create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);
    
    // Create the camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 15);
    camera.lookAt(0, 0, 0);
    
    // Create the renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x444444);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    scene.add(directionalLight);
    
    // Create game objects
    arena = new BattleArena(scene);
    player = new Player(scene, camera, sounds);
    boss = new Boss(scene, player, sounds);
    
    // Setup input handlers
    setupInputHandlers();
    
    // Start the BGM
    sounds.bgm.play();
    
    // Start the animation loop
    animate();
}

function setupInputHandlers() {
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'w') keys.w = true;
        if (e.key.toLowerCase() === 'a') keys.a = true;
        if (e.key.toLowerCase() === 's') keys.s = true;
        if (e.key.toLowerCase() === 'd') keys.d = true;
        if (e.key === ' ') keys.space = true;
        if (e.key === 'Shift') keys.shift = true;
    });
    
    window.addEventListener('keyup', (e) => {
        if (e.key.toLowerCase() === 'w') keys.w = false;
        if (e.key.toLowerCase() === 'a') keys.a = false;
        if (e.key.toLowerCase() === 's') keys.s = false;
        if (e.key.toLowerCase() === 'd') keys.d = false;
        if (e.key === ' ') keys.space = false;
        if (e.key === 'Shift') keys.shift = false;
    });
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    restartButton.addEventListener('click', restartGame);
}

function animate(time = 0) {
    requestAnimationFrame(animate);
    
    if (!gameActive) return;
    
    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;
    
    // Update game objects
    player.update(deltaTime, keys);
    boss.update(deltaTime);
    
    // Check for collisions and damage
    checkCollisions();
    
    // Update UI
    updateUI();
    
    // Render the scene
    renderer.render(scene, camera);
}

function checkCollisions() {
    // Check if player is hit by boss attacks
    if (boss.checkPlayerCollision(player)) {
        player.takeDamage(10);
        sounds.playerHit.play();
        
        if (player.health <= 0) {
            endGame(false);
        }
    }
    
    // Check if boss is hit by player attacks
    if (player.isAttacking && player.checkBossCollision(boss)) {
        boss.takeDamage(5);
        sounds.bossHit.play();
        
        if (boss.health <= 0) {
            endGame(true);
        }
    }
}

function updateUI() {
    // Update health bars
    playerHealthFill.style.width = `${(player.health / player.maxHealth) * 100}%`;
    bossHealthFill.style.width = `${(boss.health / boss.maxHealth) * 100}%`;
}

function endGame(playerWon) {
    gameActive = false;
    
    // Stop BGM
    sounds.bgm.stop();
    
    // Show game over screen with appropriate message
    if (playerWon) {
        endMessage.textContent = "VICTORY!";
        sounds.victory.play();
    } else {
        endMessage.textContent = "DEFEATED...";
        sounds.defeat.play();
    }
    
    gameOverScreen.classList.remove('hidden');
}

function restartGame() {
    // Reset game state
    gameActive = true;
    gameOverScreen.classList.add('hidden');
    
    // Remove all existing objects
    while(scene.children.length > 0){ 
        scene.remove(scene.children[0]); 
    }
    
    // Reinitialize the game
    init();
}

// Start the game
init();

