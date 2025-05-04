import * as THREE from 'three';

export class Player {
    constructor(scene, camera, sounds) {
        this.scene = scene;
        this.camera = camera;
        this.sounds = sounds;
        
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.speed = 8;
        this.dashSpeed = 16;
        this.isDashing = false;
        this.dashCooldown = 0;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        
        this.createPlayer();
    }
    
    createPlayer() {
        // Create player mesh
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
        const material = new THREE.MeshLambertMaterial({ color: 0x3498db });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = 0.75;
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);
        
        // Create sword
        const swordGeometry = new THREE.BoxGeometry(0.2, 1.5, 0.2);
        const swordMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
        this.sword = new THREE.Mesh(swordGeometry, swordMaterial);
        this.sword.position.set(0.8, 0.5, 0);
        this.mesh.add(this.sword);
        
        // Attack hitbox (invisible)
        const hitboxGeometry = new THREE.BoxGeometry(2, 1, 2);
        const hitboxMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.0 
        });
        this.attackHitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
        this.attackHitbox.position.set(1, 0, 0);
        this.mesh.add(this.attackHitbox);
        
        // Create a helper arrow to show forward direction
        const arrowGeometry = new THREE.ConeGeometry(0.2, 0.5, 8);
        const arrowMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        this.arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        this.arrow.rotation.x = Math.PI / 2;
        this.arrow.position.set(0, 0.1, 0.8);
        this.mesh.add(this.arrow);
    }
    
    update(deltaTime, keys) {
        // Handle movement
        let moveX = 0;
        let moveZ = 0;
        
        if (keys.w) moveZ -= 1;
        if (keys.s) moveZ += 1;
        if (keys.a) moveX -= 1;
        if (keys.d) moveX += 1;
        
        // Normalize diagonal movement
        if (moveX !== 0 && moveZ !== 0) {
            moveX /= Math.sqrt(2);
            moveZ /= Math.sqrt(2);
        }
        
        // Move the player
        if (moveX !== 0 || moveZ !== 0) {
            // Calculate movement speed
            let currentSpeed = this.speed;
            
            // Handle dash
            if (keys.shift && this.dashCooldown <= 0) {
                this.isDashing = true;
                this.dashCooldown = 1.5; // 1.5 seconds cooldown
                currentSpeed = this.dashSpeed;
                this.invulnerable = true;
                this.invulnerabilityTime = 0.3; // Invulnerable during dash
            }
            
            // Apply movement
            this.mesh.position.x += moveX * currentSpeed * deltaTime;
            this.mesh.position.z += moveZ * currentSpeed * deltaTime;
            
            // Rotate player to face movement direction
            this.mesh.rotation.y = Math.atan2(moveX, moveZ);
        }
        
        // Keep player within arena bounds (15x15)
        const arenaSize = 14;
        this.mesh.position.x = Math.max(-arenaSize, Math.min(arenaSize, this.mesh.position.x));
        this.mesh.position.z = Math.max(-arenaSize, Math.min(arenaSize, this.mesh.position.z));
        
        // Update dash cooldown
        if (this.dashCooldown > 0) {
            this.dashCooldown -= deltaTime;
        }
        
        // Reset dash state
        this.isDashing = false;
        
        // Handle attack
        if (keys.space && this.attackCooldown <= 0) {
            this.attack();
        }
        
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
            
            // Reset attack state at the end of animation
            if (this.attackCooldown <= 0) {
                this.isAttacking = false;
                this.sword.rotation.z = 0;
            }
        }
        
        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerabilityTime -= deltaTime;
            
            // Flash effect when invulnerable
            this.mesh.visible = Math.floor(this.invulnerabilityTime * 10) % 2 === 0;
            
            if (this.invulnerabilityTime <= 0) {
                this.invulnerable = false;
                this.mesh.visible = true;
            }
        }
        
        // Update camera to follow player
        this.camera.position.x = this.mesh.position.x;
        this.camera.position.z = this.mesh.position.z + 15;
        this.camera.lookAt(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z);
    }
    
    attack() {
        this.isAttacking = true;
        this.attackCooldown = 0.3; // 0.3 seconds attack animation
        
        // Sword swing animation
        this.sword.rotation.z = Math.PI;
        
        // Return to original position smoothly (handled in update)
    }
    
    takeDamage(amount) {
        if (!this.invulnerable) {
            this.health = Math.max(0, this.health - amount);
            this.invulnerable = true;
            this.invulnerabilityTime = 1; // 1 second of invulnerability after hit
        }
    }
    
    checkBossCollision(boss) {
        if (!this.isAttacking) return false;
        
        // Get attack hitbox world position
        const hitboxPosition = new THREE.Vector3();
        this.attackHitbox.getWorldPosition(hitboxPosition);
        
        // Calculate distance between attack hitbox and boss
        const distance = hitboxPosition.distanceTo(boss.mesh.position);
        
        // Check if boss is within attack range
        return distance < 3; // Adjust range as needed
    }
}

