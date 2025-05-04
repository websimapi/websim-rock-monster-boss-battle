import * as THREE from 'three';

export class BattleArena {
    constructor(scene) {
        this.scene = scene;
        this.createArena();
    }
    
    createArena() {
        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(30, 30);
        const floorTexture = new THREE.TextureLoader().load('floor_texture.png');
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(10, 10);
        
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: floorTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Create arena walls
        const wallHeight = 2;
        const wallWidth = 30;
        const wallDepth = 1;
        
        const wallGeometry = new THREE.BoxGeometry(wallWidth, wallHeight, wallDepth);
        const wallTexture = new THREE.TextureLoader().load('wall_texture.png');
        wallTexture.wrapS = THREE.RepeatWrapping;
        wallTexture.repeat.set(10, 1);
        
        const wallMaterial = new THREE.MeshStandardMaterial({
            map: wallTexture,
            roughness: 0.7,
            metalness: 0.3
        });
        
        // North wall
        const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
        northWall.position.set(0, wallHeight / 2, -wallWidth / 2);
        northWall.castShadow = true;
        northWall.receiveShadow = true;
        this.scene.add(northWall);
        
        // South wall
        const southWall = new THREE.Mesh(wallGeometry, wallMaterial);
        southWall.position.set(0, wallHeight / 2, wallWidth / 2);
        southWall.castShadow = true;
        southWall.receiveShadow = true;
        this.scene.add(southWall);
        
        // East wall
        const eastWall = new THREE.Mesh(wallGeometry, wallMaterial);
        eastWall.rotation.y = Math.PI / 2;
        eastWall.position.set(wallWidth / 2, wallHeight / 2, 0);
        eastWall.castShadow = true;
        eastWall.receiveShadow = true;
        this.scene.add(eastWall);
        
        // West wall
        const westWall = new THREE.Mesh(wallGeometry, wallMaterial);
        westWall.rotation.y = Math.PI / 2;
        westWall.position.set(-wallWidth / 2, wallHeight / 2, 0);
        westWall.castShadow = true;
        westWall.receiveShadow = true;
        this.scene.add(westWall);
        
        // Add some pillars for extra detail
        this.createPillars();
        
        // Create ambient particles
        this.createParticles();
    }
    
    createPillars() {
        const pillarGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 8);
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.7,
            metalness: 0.3
        });
        
        const pillarPositions = [
            [-13, -13], [13, -13], [-13, 13], [13, 13]
        ];
        
        for (const pos of pillarPositions) {
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(pos[0], 2, pos[1]);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            this.scene.add(pillar);
            
            // Add a decorative top
            const topGeometry = new THREE.BoxGeometry(1.5, 0.5, 1.5);
            const top = new THREE.Mesh(topGeometry, pillarMaterial);
            top.position.set(pos[0], 4.25, pos[1]);
            top.castShadow = true;
            top.receiveShadow = true;
            this.scene.add(top);
        }
    }
    
    createParticles() {
        // Create dust particles
        const particleCount = 100;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xDDDDDD,
                transparent: true,
                opacity: Math.random() * 0.5 + 0.1
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Random position within arena
            particle.position.set(
                (Math.random() - 0.5) * 28,
                Math.random() * 5 + 0.5,
                (Math.random() - 0.5) * 28
            );
            
            // Store random movement parameters
            particle.userData = {
                speed: Math.random() * 0.2 + 0.1,
                rotationSpeed: Math.random() * 0.02 - 0.01,
                direction: new THREE.Vector3(
                    Math.random() * 2 - 1,
                    Math.random() * 2 - 1,
                    Math.random() * 2 - 1
                ).normalize()
            };
            
            particles.add(particle);
        }
        
        this.scene.add(particles);
        
        // Animate particles
        const animateParticles = () => {
            particles.children.forEach(particle => {
                // Move particle
                particle.position.x += particle.userData.direction.x * particle.userData.speed * 0.01;
                particle.position.y += particle.userData.direction.y * particle.userData.speed * 0.01;
                particle.position.z += particle.userData.direction.z * particle.userData.speed * 0.01;
                
                // Rotate particle
                particle.rotation.x += particle.userData.rotationSpeed;
                particle.rotation.y += particle.userData.rotationSpeed;
                
                // Boundary check and bounce
                const bounds = 14;
                if (Math.abs(particle.position.x) > bounds) {
                    particle.userData.direction.x *= -1;
                }
                if (particle.position.y < 0.1 || particle.position.y > 6) {
                    particle.userData.direction.y *= -1;
                }
                if (Math.abs(particle.position.z) > bounds) {
                    particle.userData.direction.z *= -1;
                }
            });
            
            requestAnimationFrame(animateParticles);
        };
        
        animateParticles();
    }
}

