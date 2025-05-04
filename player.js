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
        
        // New energy system for dash
        this.maxEnergy = 100;
        this.energy = this.maxEnergy;
        this.energyPerDash = 33; // 33% energy per dash
        this.energyRechargeRate = 20; // Points per second
        this.isHoldingSpace = false;
        this.spaceHeldTime = 0;
        this.walkSpeedBoost = 1.2; // 20% speed boost when holding space
        this.mousePosition = new THREE.Vector2();
        
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
    
    update(deltaTime, keys, mousePosition) {
        // Store mouse position for dash direction
        if (mousePosition) {
            this.mousePosition = mousePosition;
        }
        
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
        
        // Handle space key for dash/speed boost
        if (keys.space && !this.isHoldingSpace) {
            // Space just pressed
            this.isHoldingSpace = true;
            this.spaceHeldTime = 0;
        } else if (!keys.space && this.isHoldingSpace) {
            // Space just released - trigger dash if not held too long
            if (this.spaceHeldTime < 0.3 && this.energy >= this.energyPerDash) { // 300ms threshold
                this.triggerDash(moveX, moveZ);
            }
            this.isHoldingSpace = false;
        }
        
        if (this.isHoldingSpace) {
            this.spaceHeldTime += deltaTime;
            
            // Deplete energy when holding space for running (20% every 0.5 seconds)
            if (this.spaceHeldTime >= 0.3 && (moveX !== 0 || moveZ !== 0)) {
                // Calculate energy depletion rate (20% per 0.5 seconds)
                const depletionRate = this.maxEnergy * 0.2 * (deltaTime / 0.5);
                this.energy = Math.max(0, this.energy - depletionRate);
            }
        }
        
        // Move the player
        if (moveX !== 0 || moveZ !== 0) {
            // Calculate movement speed
            let currentSpeed = this.speed;
            
            // Apply speed boost when holding space
            if (this.isHoldingSpace && this.spaceHeldTime >= 0.3 && this.energy > 0) {
                currentSpeed *= this.walkSpeedBoost;
            }
            
            // Apply dash speed if dashing
            if (this.isDashing) {
                currentSpeed = this.dashSpeed;
            }
            
            // Apply movement
            this.mesh.position.x += moveX * currentSpeed * deltaTime;
            this.mesh.position.z += moveZ * currentSpeed * deltaTime;
            
            // Recharge energy when moving normally (not dashing)
            if (!this.isDashing) {
                this.energy = Math.min(this.maxEnergy, this.energy + this.energyRechargeRate * deltaTime);
            }
            
            // Rotate player to face movement direction
            this.mesh.rotation.y = Math.atan2(moveX, moveZ);
        } else if (!this.isDashing) {
            // Recharge energy when standing still
            this.energy = Math.min(this.maxEnergy, this.energy + this.energyRechargeRate * 0.5 * deltaTime);
        }
        
        // Keep player within arena bounds (15x15)
        const arenaSize = 14;
        this.mesh.position.x = Math.max(-arenaSize, Math.min(arenaSize, this.mesh.position.x));
        this.mesh.position.z = Math.max(-arenaSize, Math.min(arenaSize, this.mesh.position.z));
        
        // Update dash cooldown and state
        if (this.isDashing) {
            this.dashCooldown -= deltaTime;
            if (this.dashCooldown <= 0) {
                this.isDashing = false;
            }
        }
        
        // Handle attack (moved to right mouse button in main.js)
        if (keys.attack && this.attackCooldown <= 0) {
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
    
    triggerDash(moveX, moveZ) {
        // Don't dash if already dashing or no energy
        if (this.isDashing || this.energy < this.energyPerDash) return;
        
        // Calculate dash direction based on mouse position or movement direction
        let dashDirection = new THREE.Vector2();
        
        // Check if we have a valid mouse position
        if (this.mousePosition.x !== 0 || this.mousePosition.y !== 0) {
            // Convert screen coordinates to 3D world direction
            // We're creating a ray from the camera to the mouse point
            const vector = new THREE.Vector3(
                (this.mousePosition.x / window.innerWidth) * 2 - 1,
                -(this.mousePosition.y / window.innerHeight) * 2 + 1,
                0.5
            );
            
            vector.unproject(this.camera);
            vector.sub(this.camera.position).normalize();
            
            // Project the direction onto the XZ plane
            const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
            const raycast = new THREE.Raycaster(this.camera.position, vector);
            const point = new THREE.Vector3();
            raycast.ray.intersectPlane(floorPlane, point);
            
            // Calculate direction from player to intersection point
            dashDirection.x = point.x - this.mesh.position.x;
            dashDirection.y = point.z - this.mesh.position.z;
            dashDirection.normalize();
        } else if (moveX !== 0 || moveZ !== 0) {
            // Use movement direction if mouse position isn't available
            dashDirection.x = moveX;
            dashDirection.y = moveZ;
            dashDirection.normalize();
        } else {
            // If no movement input and no mouse position, dash forward
            dashDirection.x = Math.sin(this.mesh.rotation.y);
            dashDirection.y = Math.cos(this.mesh.rotation.y);
        }
        
        // Start the dash
        this.isDashing = true;
        this.dashCooldown = 0.3; // Duration of dash
        this.invulnerable = true;
        this.invulnerabilityTime = 0.3; // Invulnerable during dash
        
        // Use energy
        this.energy -= this.energyPerDash;
        
        // Apply an immediate boost in the dash direction
        this.mesh.position.x += dashDirection.x * 2;
        this.mesh.position.z += dashDirection.y * 2;
        
        // Rotate player in the dash direction
        this.mesh.rotation.y = Math.atan2(dashDirection.x, dashDirection.y);
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