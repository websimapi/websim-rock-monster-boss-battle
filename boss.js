import * as THREE from 'three';

export class Boss {
    constructor(scene, player, sounds) {
        this.scene = scene;
        this.player = player;
        this.sounds = sounds;
        
        this.maxHealth = 300;
        this.health = this.maxHealth;
        this.speed = 2;
        this.phase = 1; // Boss has multiple phases
        this.attackTimer = 0;
        this.currentAttack = null;
        this.attackPhase = 0;
        
        this.createBoss();
    }
    
    createBoss() {
        // Create boss body
        const bodyGeometry = new THREE.SphereGeometry(3, 16, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 1,
            metalness: 0,
            flatShading: true
        });
        this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.mesh.position.y = 3;
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);
        
        // Add details to make it look like rock
        const details = new THREE.Group();
        
        // Add rock protrusions
        for (let i = 0; i < 8; i++) {
            const rockGeometry = new THREE.IcosahedronGeometry(0.8 * Math.random() + 0.5, 0);
            const rock = new THREE.Mesh(rockGeometry, bodyMaterial);
            rock.position.set(
                2.5 * Math.sin(i * Math.PI/4),
                Math.random() * 2 - 1,
                2.5 * Math.cos(i * Math.PI/4)
            );
            details.add(rock);
        }
        
        // Add eyes
        const eyeGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-1, 1, 2);
        details.add(this.leftEye);
        
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(1, 1, 2);
        details.add(this.rightEye);
        
        this.mesh.add(details);
        
        // Create hands
        this.createHands();
        
        // Warning indicators for attacks
        this.createWarningIndicators();
    }
    
    createHands() {
        const handGeometry = new THREE.BoxGeometry(2.5, 2.5, 2.5);
        const handMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 1,
            metalness: 0,
            flatShading: true
        });
        
        // Left hand
        this.leftHand = new THREE.Group();
        this.leftHandMesh = new THREE.Mesh(handGeometry, handMaterial);
        this.leftHandMesh.castShadow = true;
        this.leftHand.add(this.leftHandMesh);
        
        // Add fingers
        for (let i = 0; i < 3; i++) {
            const fingerGeometry = new THREE.ConeGeometry(0.5, 1.5, 4);
            const finger = new THREE.Mesh(fingerGeometry, handMaterial);
            finger.position.set(-0.8 + i * 0.8, 1, 0.5);
            finger.rotation.x = -Math.PI / 3;
            this.leftHand.add(finger);
        }
        
        this.leftHand.position.set(-5, 3, 0);
        this.scene.add(this.leftHand);
        
        // Right hand
        this.rightHand = new THREE.Group();
        this.rightHandMesh = new THREE.Mesh(handGeometry, handMaterial);
        this.rightHandMesh.castShadow = true;
        this.rightHand.add(this.rightHandMesh);
        
        // Add fingers
        for (let i = 0; i < 3; i++) {
            const fingerGeometry = new THREE.ConeGeometry(0.5, 1.5, 4);
            const finger = new THREE.Mesh(fingerGeometry, handMaterial);
            finger.position.set(-0.8 + i * 0.8, 1, 0.5);
            finger.rotation.x = -Math.PI / 3;
            this.rightHand.add(finger);
        }
        
        this.rightHand.position.set(5, 3, 0);
        this.scene.add(this.rightHand);
    }
    
    createWarningIndicators() {
        // Circle warning for regular attacks
        const circleGeometry = new THREE.RingGeometry(2.5, 3, 32);
        const warningMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        this.warningCircle = new THREE.Mesh(circleGeometry, warningMaterial);
        this.warningCircle.rotation.x = -Math.PI / 2; // Lay flat on ground
        this.warningCircle.position.y = 0.1;
        this.warningCircle.visible = false;
        this.scene.add(this.warningCircle);
        
        // Line warning for directional attacks
        const lineGeometry = new THREE.PlaneGeometry(30, 3);
        const lineMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        this.warningLine = new THREE.Mesh(lineGeometry, lineMaterial);
        this.warningLine.rotation.x = -Math.PI / 2; // Lay flat on ground
        this.warningLine.position.y = 0.1;
        this.warningLine.visible = false;
        this.scene.add(this.warningLine);
        
        // Hand warning for hand attacks
        const handWarningGeometry = new THREE.RingGeometry(1.5, 2, 32);
        this.leftHandWarning = new THREE.Mesh(handWarningGeometry, warningMaterial);
        this.leftHandWarning.rotation.x = -Math.PI / 2;
        this.leftHandWarning.position.y = 0.1;
        this.leftHandWarning.visible = false;
        this.scene.add(this.leftHandWarning);
        
        this.rightHandWarning = new THREE.Mesh(handWarningGeometry, warningMaterial);
        this.rightHandWarning.rotation.x = -Math.PI / 2;
        this.rightHandWarning.position.y = 0.1;
        this.rightHandWarning.visible = false;
        this.scene.add(this.rightHandWarning);
    }
    
    update(deltaTime) {
        // Update attack timer
        this.attackTimer -= deltaTime;
        
        // Choose attack if no current attack is happening
        if (this.attackTimer <= 0 && !this.currentAttack) {
            this.chooseAttack();
        }
        
        // Update current attack
        if (this.currentAttack) {
            this[this.currentAttack](deltaTime);
        } else {
            // Basic movement when not attacking
            this.moveTowardsPlayer(deltaTime);
        }
        
        // Activate harder phases based on health
        if (this.health < this.maxHealth * 0.7 && this.phase === 1) {
            this.phase = 2;
            this.speed = 3;
        }
        if (this.health < this.maxHealth * 0.3 && this.phase === 2) {
            this.phase = 3;
            this.speed = 4;
        }
        
        // Make eyes follow player
        this.leftEye.lookAt(this.player.mesh.position);
        this.rightEye.lookAt(this.player.mesh.position);
    }
    
    moveTowardsPlayer(deltaTime) {
        const directionToPlayer = new THREE.Vector3(
            this.player.mesh.position.x - this.mesh.position.x,
            0,
            this.player.mesh.position.z - this.mesh.position.z
        ).normalize();
        
        // Move boss towards player
        this.mesh.position.x += directionToPlayer.x * this.speed * deltaTime;
        this.mesh.position.z += directionToPlayer.z * this.speed * deltaTime;
        
        // Rotate to face player
        this.mesh.lookAt(this.player.mesh.position.x, this.mesh.position.y, this.player.mesh.position.z);
        
        // Keep hands beside boss with some movement
        const time = Date.now() * 0.001;
        this.leftHand.position.set(
            this.mesh.position.x - 4 + Math.sin(time) * 0.5,
            3 + Math.sin(time * 1.5) * 0.3,
            this.mesh.position.z + Math.cos(time) * 0.5
        );
        
        this.rightHand.position.set(
            this.mesh.position.x + 4 + Math.cos(time) * 0.5,
            3 + Math.sin(time * 1.5 + Math.PI) * 0.3,
            this.mesh.position.z + Math.sin(time) * 0.5
        );
    }
    
    chooseAttack() {
        let availableAttacks = ['handSlam', 'spinAttack', 'handThrow'];
        
        // Add more complex attacks in later phases
        if (this.phase >= 2) {
            availableAttacks.push('rockSmash');
        }
        
        if (this.phase >= 3) {
            availableAttacks.push('rockStorm');
        }
        
        // Randomly select attack
        const attack = availableAttacks[Math.floor(Math.random() * availableAttacks.length)];
        this.currentAttack = attack;
        this.attackPhase = 0;
        
        // Set specific properties for each attack
        switch(attack) {
            case 'handSlam':
                this.slamHand = Math.random() < 0.5 ? 'left' : 'right';
                break;
            case 'handThrow':
                this.throwHand = Math.random() < 0.5 ? 'left' : 'right';
                this.handReturnTime = 1.5;
                break;
            case 'spinAttack':
                this.spinTime = 0;
                this.spinDuration = 2;
                break;
            case 'rockSmash':
                this.smashDirection = new THREE.Vector3(
                    this.player.mesh.position.x - this.mesh.position.x,
                    0,
                    this.player.mesh.position.z - this.mesh.position.z
                ).normalize();
                break;
            case 'rockStorm':
                this.stormPositions = [];
                for (let i = 0; i < 5; i++) {
                    // Create random positions around the player for rocks to fall
                    this.stormPositions.push(new THREE.Vector3(
                        this.player.mesh.position.x + (Math.random() - 0.5) * 10,
                        10, // height
                        this.player.mesh.position.z + (Math.random() - 0.5) * 10
                    ));
                }
                break;
        }
        
        // Show warning indicator
        this.showWarning(attack);
    }
    
    showWarning(attackType) {
        this.sounds.warning.play();
        
        switch(attackType) {
            case 'handSlam':
                if (this.slamHand === 'left') {
                    this.leftHandWarning.position.set(
                        this.player.mesh.position.x,
                        0.1,
                        this.player.mesh.position.z
                    );
                    this.leftHandWarning.visible = true;
                } else {
                    this.rightHandWarning.position.set(
                        this.player.mesh.position.x,
                        0.1,
                        this.player.mesh.position.z
                    );
                    this.rightHandWarning.visible = true;
                }
                break;
                
            case 'spinAttack':
                this.warningCircle.position.set(
                    this.mesh.position.x,
                    0.1,
                    this.mesh.position.z
                );
                this.warningCircle.scale.set(3, 3, 3); // Larger warning area
                this.warningCircle.visible = true;
                break;
                
            case 'rockSmash':
                this.warningLine.position.set(
                    this.mesh.position.x + this.smashDirection.x * 10,
                    0.1,
                    this.mesh.position.z + this.smashDirection.z * 10
                );
                this.warningLine.lookAt(
                    this.mesh.position.x, 
                    0.1, 
                    this.mesh.position.z
                );
                this.warningLine.visible = true;
                break;
                
            case 'rockStorm':
                // Create HTML-based warning indicators for each storm position
                for (let i = 0; i < this.stormPositions.length; i++) {
                    const warningElement = document.createElement('div');
                    warningElement.className = 'warning';
                    warningElement.style.width = '80px';
                    warningElement.style.height = '80px';
                    warningElement.style.borderRadius = '50%';
                    document.getElementById('overlay').appendChild(warningElement);
                    
                    // Store reference to remove later
                    this.stormPositions[i].element = warningElement;
                    
                    // Position warning based on 3D coordinates
                    this.updateStormWarningPosition(i);
                }
                break;
                
            case 'handThrow':
                if (this.throwHand === 'left') {
                    this.leftHandWarning.position.set(
                        this.player.mesh.position.x,
                        0.1,
                        this.player.mesh.position.z
                    );
                    this.leftHandWarning.visible = true;
                } else {
                    this.rightHandWarning.position.set(
                        this.player.mesh.position.x,
                        0.1,
                        this.player.mesh.position.z
                    );
                    this.rightHandWarning.visible = true;
                }
                break;
        }
    }
    
    updateStormWarningPosition(index) {
        if (!this.stormPositions[index] || !this.stormPositions[index].element) return;
        
        // Convert 3D position to screen space
        const pos = this.stormPositions[index].clone();
        pos.project(this.player.camera);
        
        // Convert to CSS coordinates
        const element = this.stormPositions[index].element;
        const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;
        
        element.style.left = `${x - 40}px`;
        element.style.top = `${y - 40}px`;
    }
    
    hideWarnings() {
        this.warningCircle.visible = false;
        this.warningLine.visible = false;
        this.leftHandWarning.visible = false;
        this.rightHandWarning.visible = false;
        
        // Remove storm warnings if they exist
        if (this.stormPositions) {
            for (let i = 0; i < this.stormPositions.length; i++) {
                if (this.stormPositions[i].element) {
                    this.stormPositions[i].element.remove();
                    this.stormPositions[i].element = null;
                }
            }
        }
    }
    
    handSlam(deltaTime) {
        const hand = this.slamHand === 'left' ? this.leftHand : this.rightHand;
        
        switch(this.attackPhase) {
            case 0: // Warning phase
                this.attackPhase = 1;
                this.attackTimer = 1; // 1 second warning
                break;
                
            case 1: // Move hand up
                hand.position.y += 8 * deltaTime;
                if (hand.position.y >= 8) {
                    this.attackPhase = 2;
                    // Position hand above player
                    hand.position.x = this.player.mesh.position.x;
                    hand.position.z = this.player.mesh.position.z;
                    this.hideWarnings();
                }
                break;
                
            case 2: // Slam down
                hand.position.y -= 16 * deltaTime;
                if (hand.position.y <= 0.5) {
                    hand.position.y = 0.5;
                    this.attackPhase = 3;
                    this.attackTimer = 0.5; // Pause at bottom
                    
                    // Create impact effect
                    const impactGeometry = new THREE.RingGeometry(0, 3, 32);
                    const impactMaterial = new THREE.MeshBasicMaterial({
                        color: 0xff0000,
                        transparent: true,
                        opacity: 0.7,
                        side: THREE.DoubleSide
                    });
                    const impact = new THREE.Mesh(impactGeometry, impactMaterial);
                    impact.position.set(hand.position.x, 0.2, hand.position.z);
                    impact.rotation.x = -Math.PI / 2;
                    this.scene.add(impact);
                    
                    // Animate and remove impact
                    const expandImpact = () => {
                        impact.scale.x += 0.1;
                        impact.scale.y += 0.1;
                        impact.scale.z += 0.1;
                        impact.material.opacity -= 0.02;
                        
                        if (impact.material.opacity <= 0) {
                            this.scene.remove(impact);
                            return;
                        }
                        
                        requestAnimationFrame(expandImpact);
                    };
                    expandImpact();
                }
                break;
                
            case 3: // Return hand
                this.attackTimer -= deltaTime;
                if (this.attackTimer <= 0) {
                    this.attackPhase = 4;
                }
                break;
                
            case 4: // End attack
                // Reset
                this.currentAttack = null;
                this.attackTimer = 2; // Cooldown before next attack
                break;
        }
    }
    
    spinAttack(deltaTime) {
        switch(this.attackPhase) {
            case 0: // Warning phase
                this.attackPhase = 1;
                this.attackTimer = 1; // 1 second warning
                break;
                
            case 1: // Start spinning
                this.hideWarnings();
                this.spinTime += deltaTime;
                
                // Rotate boss
                this.mesh.rotation.y += 10 * deltaTime;
                
                // Spin hands out
                const radius = 6 + this.spinTime * 2; // Increase radius over time
                const angle = this.mesh.rotation.y;
                
                this.leftHand.position.set(
                    this.mesh.position.x + radius * Math.cos(angle + Math.PI),
                    3,
                    this.mesh.position.z + radius * Math.sin(angle + Math.PI)
                );
                
                this.rightHand.position.set(
                    this.mesh.position.x + radius * Math.cos(angle),
                    3,
                    this.mesh.position.z + radius * Math.sin(angle)
                );
                
                // End spin after duration
                if (this.spinTime >= this.spinDuration) {
                    this.attackPhase = 2;
                    this.attackTimer = 1; // Recovery time
                }
                break;
                
            case 2: // End attack
                this.attackTimer -= deltaTime;
                
                // Move hands back to normal positions
                const time = Date.now() * 0.001;
                this.leftHand.position.set(
                    this.mesh.position.x - 4 + Math.sin(time) * 0.5,
                    3 + Math.sin(time * 1.5) * 0.3,
                    this.mesh.position.z + Math.cos(time) * 0.5
                );
                
                this.rightHand.position.set(
                    this.mesh.position.x + 4 + Math.cos(time) * 0.5,
                    3 + Math.sin(time * 1.5 + Math.PI) * 0.3,
                    this.mesh.position.z + Math.sin(time) * 0.5
                );
                
                if (this.attackTimer <= 0) {
                    // Reset
                    this.currentAttack = null;
                    this.attackTimer = 2; // Cooldown before next attack
                }
                break;
        }
    }
    
    handThrow(deltaTime) {
        const hand = this.throwHand === 'left' ? this.leftHand : this.rightHand;
        const targetPosition = new THREE.Vector3(
            this.player.mesh.position.x,
            3,
            this.player.mesh.position.z
        );
        
        switch(this.attackPhase) {
            case 0: // Warning phase
                this.attackPhase = 1;
                this.attackTimer = 1; // 1 second warning
                
                // Store initial hand position
                this.initialHandPosition = hand.position.clone();
                break;
                
            case 1: // Pull back
                // Pull hand back before throwing
                const backPosition = new THREE.Vector3(
                    this.mesh.position.x + (hand === this.leftHand ? -1 : 1) * 2,
                    3,
                    this.mesh.position.z - 2
                );
                
                hand.position.lerp(backPosition, 5 * deltaTime);
                
                this.attackTimer -= deltaTime;
                if (this.attackTimer <= 0) {
                    this.attackPhase = 2;
                    this.hideWarnings();
                    
                    // Calculate velocity for throw
                    this.throwVelocity = new THREE.Vector3(
                        targetPosition.x - hand.position.x,
                        0,
                        targetPosition.z - hand.position.z
                    ).normalize().multiplyScalar(20);
                }
                break;
                
            case 2: // Throw
                // Move hand towards player
                hand.position.x += this.throwVelocity.x * deltaTime;
                hand.position.z += this.throwVelocity.z * deltaTime;
                
                // Check if hand reached target
                const distanceToTarget = new THREE.Vector3(
                    targetPosition.x - hand.position.x,
                    0,
                    targetPosition.z - hand.position.z
                ).length();
                
                if (distanceToTarget < 1) {
                    this.attackPhase = 3;
                    this.attackTimer = this.handReturnTime; // Time before hand returns
                    
                    // Create impact effect
                    const impactGeometry = new THREE.RingGeometry(0, 3, 32);
                    const impactMaterial = new THREE.MeshBasicMaterial({
                        color: 0xff0000,
                        transparent: true,
                        opacity: 0.7,
                        side: THREE.DoubleSide
                    });
                    const impact = new THREE.Mesh(impactGeometry, impactMaterial);
                    impact.position.set(hand.position.x, 0.2, hand.position.z);
                    impact.rotation.x = -Math.PI / 2;
                    this.scene.add(impact);
                    
                    // Animate and remove impact
                    const expandImpact = () => {
                        impact.scale.x += 0.1;
                        impact.scale.y += 0.1;
                        impact.scale.z += 0.1;
                        impact.material.opacity -= 0.02;
                        
                        if (impact.material.opacity <= 0) {
                            this.scene.remove(impact);
                            return;
                        }
                        
                        requestAnimationFrame(expandImpact);
                    };
                    expandImpact();
                }
                break;
                
            case 3: // Wait before returning
                this.attackTimer -= deltaTime;
                if (this.attackTimer <= 0) {
                    this.attackPhase = 4;
                }
                break;
                
            case 4: // Return hand
                // Move hand back to its original position
                hand.position.lerp(this.initialHandPosition, 5 * deltaTime);
                
                // Check if hand is close enough to original position
                const distanceToOriginal = hand.position.distanceTo(this.initialHandPosition);
                if (distanceToOriginal < 0.5) {
                    // Reset
                    this.currentAttack = null;
                    this.attackTimer = 2; // Cooldown before next attack
                }
                break;
        }
    }
    
    rockSmash(deltaTime) {
        switch(this.attackPhase) {
            case 0: // Warning phase
                this.attackPhase = 1;
                this.attackTimer = 1; // 1 second warning
                break;
                
            case 1: // Charge
                this.attackTimer -= deltaTime;
                
                // Visual charging effect (pulsing)
                const pulseScale = 1 + Math.sin(Date.now() * 0.01) * 0.1;
                this.mesh.scale.set(pulseScale, pulseScale, pulseScale);
                
                if (this.attackTimer <= 0) {
                    this.attackPhase = 2;
                    this.hideWarnings();
                    this.mesh.scale.set(1, 1, 1); // Reset scale
                    
                    // Create rock projectiles
                    this.rockProjectiles = [];
                    const numRocks = 5 + this.phase * 2; // More rocks in later phases
                    
                    for (let i = 0; i < numRocks; i++) {
                        const rockGeometry = new THREE.IcosahedronGeometry(0.5, 0);
                        const rockMaterial = new THREE.MeshStandardMaterial({
                            color: 0x8B4513,
                            roughness: 1,
                            metalness: 0
                        });
                        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
                        rock.position.copy(this.mesh.position);
                        
                        // Calculate spread angle
                        const spreadAngle = Math.PI / 8; // 22.5 degrees
                        const angle = Math.atan2(this.smashDirection.z, this.smashDirection.x);
                        const randomAngle = angle + (Math.random() - 0.5) * spreadAngle;
                        
                        // Set velocity
                        rock.velocity = new THREE.Vector3(
                            Math.cos(randomAngle),
                            0,
                            Math.sin(randomAngle)
                        ).multiplyScalar(15 + Math.random() * 5);
                        
                        this.rockProjectiles.push(rock);
                        this.scene.add(rock);
                    }
                    
                    this.rockLifetime = 3; // Seconds before rocks disappear
                }
                break;
                
            case 2: // Update rocks
                this.rockLifetime -= deltaTime;
                
                // Update rock positions
                for (let i = 0; i < this.rockProjectiles.length; i++) {
                    const rock = this.rockProjectiles[i];
                    rock.position.x += rock.velocity.x * deltaTime;
                    rock.position.z += rock.velocity.z * deltaTime;
                    
                    // Rotate rocks
                    rock.rotation.x += 2 * deltaTime;
                    rock.rotation.y += 3 * deltaTime;
                    rock.rotation.z += 2.5 * deltaTime;
                }
                
                // End attack when rocks disappear
                if (this.rockLifetime <= 0) {
                    // Remove rocks
                    for (let i = 0; i < this.rockProjectiles.length; i++) {
                        this.scene.remove(this.rockProjectiles[i]);
                    }
                    
                    // Reset
                    this.currentAttack = null;
                    this.attackTimer = 2; // Cooldown before next attack
                }
                break;
        }
    }
    
    rockStorm(deltaTime) {
        switch(this.attackPhase) {
            case 0: // Warning phase
                this.attackPhase = 1;
                this.attackTimer = 1.5; // 1.5 second warning
                
                // Update warning positions as player moves
                for (let i = 0; i < this.stormPositions.length; i++) {
                    this.updateStormWarningPosition(i);
                }
                break;
                
            case 1: // Create falling rocks
                this.hideWarnings();
                this.attackPhase = 2;
                
                // Create rock projectiles at each position
                this.stormRocks = [];
                
                for (let i = 0; i < this.stormPositions.length; i++) {
                    const position = this.stormPositions[i];
                    
                    const rockGeometry = new THREE.IcosahedronGeometry(1, 1);
                    const rockMaterial = new THREE.MeshStandardMaterial({
                        color: 0x8B4513,
                        roughness: 1,
                        metalness: 0
                    });
                    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
                    rock.position.copy(position);
                    rock.originalY = position.y;
                    rock.targetY = 0;
                    
                    this.stormRocks.push(rock);
                    this.scene.add(rock);
                }
                
                this.stormTime = 0;
                break;
                
            case 2: // Fall rocks
                this.stormTime += deltaTime;
                
                // Update rock positions
                let allRocksLanded = true;
                
                for (let i = 0; i < this.stormRocks.length; i++) {
                    const rock = this.stormRocks[i];
                    
                    // Fall with increasing speed
                    const fallSpeed = 10 + this.stormTime * 5;
                    rock.position.y -= fallSpeed * deltaTime;
                    
                    // Rotate rock while falling
                    rock.rotation.x += 2 * deltaTime;
                    rock.rotation.y += 3 * deltaTime;
                    
                    // Check if rock has landed
                    if (rock.position.y > rock.targetY) {
                        allRocksLanded = false;
                    } else {
                        rock.position.y = rock.targetY;
                        
                        // Create impact effect if just landed
                        if (!rock.hasLanded) {
                            rock.hasLanded = true;
                            
                            const impactGeometry = new THREE.RingGeometry(0, 3, 32);
                            const impactMaterial = new THREE.MeshBasicMaterial({
                                color: 0xff0000,
                                transparent: true,
                                opacity: 0.7,
                                side: THREE.DoubleSide
                            });
                            const impact = new THREE.Mesh(impactGeometry, impactMaterial);
                            impact.position.set(rock.position.x, 0.2, rock.position.z);
                            impact.rotation.x = -Math.PI / 2;
                            this.scene.add(impact);
                            
                            // Animate and remove impact
                            const expandImpact = () => {
                                impact.scale.x += 0.1;
                                impact.scale.y += 0.1;
                                impact.scale.z += 0.1;
                                impact.material.opacity -= 0.02;
                                
                                if (impact.material.opacity <= 0) {
                                    this.scene.remove(impact);
                                    return;
                                }
                                
                                requestAnimationFrame(expandImpact);
                            };
                            expandImpact();
                        }
                    }
                }
                
                // Move to cleanup when all rocks have landed
                if (allRocksLanded) {
                    this.attackPhase = 3;
                    this.attackTimer = 1; // Time before rocks disappear
                }
                break;
                
            case 3: // Cleanup
                this.attackTimer -= deltaTime;
                
                if (this.attackTimer <= 0) {
                    // Remove rocks
                    for (let i = 0; i < this.stormRocks.length; i++) {
                        this.scene.remove(this.stormRocks[i]);
                    }
                    
                    // Reset
                    this.currentAttack = null;
                    this.attackTimer = 2; // Cooldown before next attack
                }
                break;
        }
    }
    
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        // Flash boss red when hit
        this.mesh.material.color.set(0xff0000);
        setTimeout(() => {
            this.mesh.material.color.set(0x8B4513);
        }, 100);
    }
    
    checkPlayerCollision(player) {
        const checkHandCollision = (hand) => {
            const handPosition = new THREE.Vector3();
            if (hand === this.leftHand) {
                this.leftHandMesh.getWorldPosition(handPosition);
            } else {
                this.rightHandMesh.getWorldPosition(handPosition);
            }
            
            // Check distance to player
            const distance = handPosition.distanceTo(player.mesh.position);
            return distance < 2.5; // Hand collision radius
        };
        
        // Check body collision
        const bodyDistance = this.mesh.position.distanceTo(player.mesh.position);
        if (bodyDistance < 4) { // Body collision radius
            return true;
        }
        
        // Check hands collision
        if (this.currentAttack === 'spinAttack' && 
            (checkHandCollision(this.leftHand) || checkHandCollision(this.rightHand))) {
            return true;
        }
        
        // Check hand slam collision
        if (this.currentAttack === 'handSlam' && this.attackPhase === 2) {
            const hand = this.slamHand === 'left' ? this.leftHand : this.rightHand;
            if (checkHandCollision(hand)) {
                return true;
            }
        }
        
        // Check hand throw collision
        if (this.currentAttack === 'handThrow' && this.attackPhase === 2) {
            const hand = this.throwHand === 'left' ? this.leftHand : this.rightHand;
            if (checkHandCollision(hand)) {
                return true;
            }
        }
        
        // Check rock smash collision
        if (this.currentAttack === 'rockSmash' && this.attackPhase === 2) {
            for (let i = 0; i < this.rockProjectiles.length; i++) {
                const rock = this.rockProjectiles[i];
                const distance = rock.position.distanceTo(player.mesh.position);
                if (distance < 1.5) { // Rock collision radius
                    return true;
                }
            }
        }
        
        // Check rock storm collision
        if (this.currentAttack === 'rockStorm' && this.attackPhase === 2) {
            for (let i = 0; i < this.stormRocks.length; i++) {
                const rock = this.stormRocks[i];
                if (rock.hasLanded) continue; // Skip landed rocks
                
                const distance = new THREE.Vector2(
                    rock.position.x - player.mesh.position.x,
                    rock.position.z - player.mesh.position.z
                ).length();
                
                if (distance < 1.5 && rock.position.y < 3) { // Check if rock is close to player height
                    return true;
                }
            }
        }
        
        return false;
    }
}

