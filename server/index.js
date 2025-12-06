require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Configure multer for scene image uploads
const sceneImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const scenesDir = path.join(__dirname, '../assets/scene_backgrounds');
        if (!fs.existsSync(scenesDir)) {
            fs.mkdirSync(scenesDir, { recursive: true });
        }
        cb(null, scenesDir);
    },
    filename: (req, file, cb) => {
        // Use the scene ID to generate the correct filename
        const sceneId = req.params.sceneId;
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        cb(null, `${sceneId}${ext}`);
    }
});

const sceneImageUpload = multer({
    storage: sceneImageStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PNG, JPEG, WebP, and GIF are allowed.'));
        }
    }
});
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve assets from assets directory
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Serve music files
app.use('/music', express.static(path.join(__dirname, '../music')));

// Serve sound effects and other non-music audio files
app.use('/sounds', express.static(path.join(__dirname, '../sounds')));

// API endpoint to list available music tracks
app.get('/api/music', (req, res) => {
    const fs = require('fs');
    const musicDir = path.join(__dirname, '../music');
    
    try {
        const files = fs.readdirSync(musicDir)
            .filter(f => f.endsWith('.mp3') || f.endsWith('.mid'))
            .map(f => {
                // Clean up the name: remove extension, track number, and parenthetical prefixes
                let name = f.replace(/\.(mp3|mid)$/i, '');
                name = name.replace(/^\d+\.\s*/, '');  // Remove "01. " prefix
                name = name.replace(/^\d+\s*-\s*/, ''); // Remove "01 - " prefix
                
                return {
                    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
                    filename: f,
                    name: name,
                    url: `/music/${encodeURIComponent(f)}`,
                    type: f.endsWith('.mp3') ? 'mp3' : 'midi'
                };
            });
        res.json(files);
    } catch (err) {
        res.json([]);
    }
});

// Basic health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// API endpoint to list available scenes
app.get('/api/scenes', (req, res) => {
    const fs = require('fs');
    const scenesDir = path.join(__dirname, '../assets/scene_backgrounds');
    
    try {
        const files = fs.readdirSync(scenesDir)
            .filter(f => f.endsWith('.json'));
        
        const scenes = files.map(f => {
            try {
                const content = fs.readFileSync(path.join(scenesDir, f), 'utf8');
                const scene = JSON.parse(content);
                return {
                    ...scene,
                    imageUrl: `/assets/scene_backgrounds/${scene.image}`
                };
            } catch (err) {
                console.error(`Error reading scene ${f}:`, err);
                return null;
            }
        }).filter(s => s !== null);
        
        // Sort by adventure, act, chapter, scene
        scenes.sort((a, b) => {
            if (a.adventure !== b.adventure) return a.adventure.localeCompare(b.adventure);
            if (a.act !== b.act) return a.act - b.act;
            if (a.chapter !== b.chapter) return a.chapter - b.chapter;
            return a.scene - b.scene;
        });
        
        res.json(scenes);
    } catch (err) {
        console.error('Error listing scenes:', err);
        res.json([]);
    }
});

// API endpoint to get adventure guide (for GM validation in simulation)
app.get('/api/adventures/:adventureId/guide', (req, res) => {
    const fs = require('fs');
    const adventuresDir = path.join(__dirname, '../assets/adventures');
    const adventureId = req.params.adventureId;
    const guideFile = path.join(adventuresDir, `${adventureId}_Guide.json`);
    
    try {
        if (fs.existsSync(guideFile)) {
            const content = fs.readFileSync(guideFile, 'utf8');
            const guide = JSON.parse(content);
            res.json(guide);
        } else {
            res.status(404).json({ error: 'Guide not found' });
        }
    } catch (err) {
        console.error('Error loading adventure guide:', err);
        res.status(500).json({ error: 'Failed to load guide' });
    }
});

// API endpoint to get scenes for a specific adventure
app.get('/api/adventures/:adventureId/scenes', (req, res) => {
    const fs = require('fs');
    const scenesDir = path.join(__dirname, '../assets/scene_backgrounds');
    const adventureId = req.params.adventureId;
    
    try {
        const files = fs.readdirSync(scenesDir)
            .filter(f => f.startsWith(adventureId) && f.endsWith('.json'));
        
        const scenes = files.map(f => {
            try {
                const content = fs.readFileSync(path.join(scenesDir, f), 'utf8');
                const scene = JSON.parse(content);
                return {
                    ...scene,
                    imageUrl: `/assets/scene_backgrounds/${scene.image}`
                };
            } catch (err) {
                console.error(`Error reading scene ${f}:`, err);
                return null;
            }
        }).filter(s => s !== null);
        
        // Sort by act, chapter, scene
        scenes.sort((a, b) => {
            if (a.act !== b.act) return a.act - b.act;
            if (a.chapter !== b.chapter) return a.chapter - b.chapter;
            return a.scene - b.scene;
        });
        
        res.json(scenes);
    } catch (err) {
        console.error('Error listing adventure scenes:', err);
        res.status(500).json({ error: 'Failed to load scenes' });
    }
});

// API endpoint to get a specific scene
app.get('/api/scenes/:id', (req, res) => {
    const scenesDir = path.join(__dirname, '../assets/scene_backgrounds');
    const sceneFile = path.join(scenesDir, `${req.params.id}.json`);
    
    try {
        const content = fs.readFileSync(sceneFile, 'utf8');
        const scene = JSON.parse(content);
        scene.imageUrl = `/assets/scene_backgrounds/${scene.image}`;
        res.json(scene);
    } catch (err) {
        res.status(404).json({ error: 'Scene not found' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENE IMAGE MANAGEMENT - Upload, update, and remove scene background images
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Upload or replace a scene's background image
 * POST /api/scenes/:sceneId/image
 * Body: multipart/form-data with 'image' field
 * 
 * The image will be saved with the scene ID as filename (e.g., AChangeOfHeart_Act_01_Chapter_01_Scene_01.png)
 * and the scene JSON will be updated to reference it.
 */
app.post('/api/scenes/:sceneId/image', sceneImageUpload.single('image'), (req, res) => {
    const sceneId = req.params.sceneId;
    const scenesDir = path.join(__dirname, '../assets/scene_backgrounds');
    const sceneFile = path.join(scenesDir, `${sceneId}.json`);
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        
        // Read the scene JSON
        if (!fs.existsSync(sceneFile)) {
            // Clean up uploaded file if scene doesn't exist
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Scene not found' });
        }
        
        const content = fs.readFileSync(sceneFile, 'utf8');
        const scene = JSON.parse(content);
        
        // Delete old image if it exists and is different from new one
        const oldImage = scene.image;
        const newImage = req.file.filename;
        
        if (oldImage && oldImage !== newImage) {
            const oldImagePath = path.join(scenesDir, oldImage);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
                console.log(`[SceneImage] Deleted old image: ${oldImage}`);
            }
        }
        
        // Update scene JSON with new image filename
        scene.image = newImage;
        fs.writeFileSync(sceneFile, JSON.stringify(scene, null, 2));
        
        console.log(`[SceneImage] Updated scene ${sceneId} with image: ${newImage}`);
        
        res.json({
            success: true,
            sceneId,
            image: newImage,
            imageUrl: `/assets/scene_backgrounds/${newImage}`
        });
        
    } catch (err) {
        console.error(`[SceneImage] Error uploading image for ${sceneId}:`, err);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

/**
 * Remove a scene's background image
 * DELETE /api/scenes/:sceneId/image
 * 
 * Deletes the image file and clears the image field in the scene JSON.
 */
app.delete('/api/scenes/:sceneId/image', (req, res) => {
    const sceneId = req.params.sceneId;
    const scenesDir = path.join(__dirname, '../assets/scene_backgrounds');
    const sceneFile = path.join(scenesDir, `${sceneId}.json`);
    
    try {
        // Read the scene JSON
        if (!fs.existsSync(sceneFile)) {
            return res.status(404).json({ error: 'Scene not found' });
        }
        
        const content = fs.readFileSync(sceneFile, 'utf8');
        const scene = JSON.parse(content);
        
        // Delete the image file if it exists
        if (scene.image) {
            const imagePath = path.join(scenesDir, scene.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log(`[SceneImage] Deleted image: ${scene.image}`);
            }
        }
        
        // Clear the image field in scene JSON
        delete scene.image;
        fs.writeFileSync(sceneFile, JSON.stringify(scene, null, 2));
        
        console.log(`[SceneImage] Removed image from scene ${sceneId}`);
        
        res.json({
            success: true,
            sceneId,
            image: null,
            imageUrl: null
        });
        
    } catch (err) {
        console.error(`[SceneImage] Error removing image for ${sceneId}:`, err);
        res.status(500).json({ error: 'Failed to remove image' });
    }
});

// API endpoint to list adventure guides
app.get('/api/guides', (req, res) => {
    const fs = require('fs');
    const guidesDir = path.join(__dirname, '../assets/adventures');
    
    try {
        if (!fs.existsSync(guidesDir)) {
            return res.json([]);
        }
        
        const files = fs.readdirSync(guidesDir)
            .filter(f => f.endsWith('.json'));
        
        const guides = files.map(f => {
            try {
                const content = fs.readFileSync(path.join(guidesDir, f), 'utf8');
                const guide = JSON.parse(content);
                return {
                    id: guide.id,
                    adventure: guide.adventure,
                    version: guide.version,
                    lastUpdated: guide.lastUpdated,
                    overview: guide.overview
                };
            } catch (err) {
                console.error(`Error reading guide ${f}:`, err);
                return null;
            }
        }).filter(g => g !== null);
        
        res.json(guides);
    } catch (err) {
        console.error('Error listing guides:', err);
        res.json([]);
    }
});

// API endpoint to get a specific adventure guide
app.get('/api/guides/:id', (req, res) => {
    const fs = require('fs');
    const guidesDir = path.join(__dirname, '../assets/adventures');
    const guideFile = path.join(guidesDir, `${req.params.id}.json`);
    
    try {
        const content = fs.readFileSync(guideFile, 'utf8');
        const guide = JSON.parse(content);
        res.json(guide);
    } catch (err) {
        res.status(404).json({ error: 'Guide not found' });
    }
});

// API endpoint to get a specific section from a guide
app.get('/api/guides/:id/section/:sectionId', (req, res) => {
    const fs = require('fs');
    const guidesDir = path.join(__dirname, '../assets/adventures');
    const guideFile = path.join(guidesDir, `${req.params.id}.json`);
    
    try {
        const content = fs.readFileSync(guideFile, 'utf8');
        const guide = JSON.parse(content);
        
        const sectionId = req.params.sectionId;
        if (guide.content && guide.content[sectionId]) {
            res.json({
                id: sectionId,
                ...guide.content[sectionId]
            });
        } else {
            res.status(404).json({ error: 'Section not found' });
        }
    } catch (err) {
        res.status(404).json({ error: 'Guide not found' });
    }
});

// API endpoint to get NPC statblock
// Query param: ?role=gm returns full data, otherwise returns public-only
app.get('/api/npcs/:id', (req, res) => {
    const fs = require('fs');
    const npcsDir = path.join(__dirname, '../assets/characters/npcs');
    const npcFile = path.join(npcsDir, `${req.params.id}.json`);
    const isGM = req.query.role === 'gm';
    
    try {
        const content = fs.readFileSync(npcFile, 'utf8');
        const npc = JSON.parse(content);
        
        // If NPC has public/private structure, filter based on role
        if (npc.public && npc.private) {
            if (isGM) {
                // GM gets everything - flatten public + private
                res.json({
                    id: npc.id,
                    name: npc.name,
                    type: npc.type,
                    archetype: npc.archetype,
                    // Public info
                    ...npc.public,
                    // Private info (overwrites public if same keys)
                    description: npc.private.full_description || npc.public.description,
                    stats: npc.private.stats,
                    attributes: npc.private.attributes,
                    skills: npc.private.skills,
                    weapons: npc.private.weapons,
                    abilities: npc.private.abilities,
                    cyberware: npc.private.cyberware,
                    behavior: npc.private.behavior,
                    secrets: npc.private.secrets,
                    loot: npc.private.loot,
                    notes: npc.private.gm_notes,
                    // Mark as full access
                    _fullAccess: true
                });
            } else {
                // Players only get public info
                res.json({
                    id: npc.id,
                    name: npc.name,
                    type: npc.type,
                    archetype: npc.archetype,
                    ...npc.public,
                    // Mark as limited access
                    _fullAccess: false
                });
            }
        } else {
            // Legacy format - return as-is (GM only for backwards compat)
            if (isGM) {
                res.json(npc);
            } else {
                // Return minimal info for legacy NPCs
                res.json({
                    id: npc.id,
                    name: npc.name,
                    type: npc.type,
                    description: npc.description,
                    _fullAccess: false
                });
            }
        }
    } catch (err) {
        res.status(404).json({ error: 'NPC not found' });
    }
});

// API endpoint to list all NPCs
app.get('/api/npcs', (req, res) => {
    const fs = require('fs');
    const npcsDir = path.join(__dirname, '../assets/characters/npcs');
    
    try {
        if (!fs.existsSync(npcsDir)) {
            return res.json([]);
        }
        
        const files = fs.readdirSync(npcsDir)
            .filter(f => f.endsWith('.json'));
        
        const npcs = files.map(f => {
            try {
                const content = fs.readFileSync(path.join(npcsDir, f), 'utf8');
                const npc = JSON.parse(content);
                return {
                    id: npc.id,
                    name: npc.name,
                    type: npc.type,
                    archetype: npc.archetype,
                    description: npc.description
                };
            } catch (err) {
                console.error(`Error reading NPC ${f}:`, err);
                return null;
            }
        }).filter(n => n !== null);
        
        res.json(npcs);
    } catch (err) {
        console.error('Error listing NPCs:', err);
        res.json([]);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// TERMINALS API - In-game computer terminals
// ═══════════════════════════════════════════════════════════════════════════

// API endpoint to list all terminals
app.get('/api/terminals', (req, res) => {
    const fs = require('fs');
    const terminalsDir = path.join(__dirname, '../assets/terminals');
    
    try {
        if (!fs.existsSync(terminalsDir)) {
            return res.json([]);
        }
        
        const files = fs.readdirSync(terminalsDir)
            .filter(f => f.endsWith('.json'));
        
        const terminals = files.map(f => {
            try {
                const content = fs.readFileSync(path.join(terminalsDir, f), 'utf8');
                const terminal = JSON.parse(content);
                return {
                    id: terminal.id,
                    name: terminal.name,
                    type: terminal.type,
                    location: terminal.location,
                    adventure: terminal.adventure,
                    description: terminal.description
                };
            } catch (err) {
                console.error(`Error reading terminal ${f}:`, err);
                return null;
            }
        }).filter(t => t !== null);
        
        res.json(terminals);
    } catch (err) {
        console.error('Error listing terminals:', err);
        res.json([]);
    }
});

// API endpoint to get a specific terminal
app.get('/api/terminals/:id', (req, res) => {
    const fs = require('fs');
    const terminalsDir = path.join(__dirname, '../assets/terminals');
    const terminalFile = path.join(terminalsDir, `${req.params.id}.json`);
    
    try {
        const content = fs.readFileSync(terminalFile, 'utf8');
        const terminal = JSON.parse(content);
        res.json(terminal);
    } catch (err) {
        res.status(404).json({ error: 'Terminal not found' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTS API - In-game readable documents
// ═══════════════════════════════════════════════════════════════════════════

// API endpoint to list all documents
app.get('/api/documents', (req, res) => {
    const fs = require('fs');
    const documentsDir = path.join(__dirname, '../assets/documents');
    
    try {
        if (!fs.existsSync(documentsDir)) {
            return res.json([]);
        }
        
        const files = fs.readdirSync(documentsDir)
            .filter(f => f.endsWith('.json'));
        
        const documents = files.map(f => {
            try {
                const content = fs.readFileSync(path.join(documentsDir, f), 'utf8');
                const doc = JSON.parse(content);
                return {
                    id: doc.id,
                    name: doc.name,
                    type: doc.type,
                    format: doc.format,
                    adventure: doc.adventure,
                    metadata: doc.metadata
                };
            } catch (err) {
                console.error(`Error reading document ${f}:`, err);
                return null;
            }
        }).filter(d => d !== null);
        
        res.json(documents);
    } catch (err) {
        console.error('Error listing documents:', err);
        res.json([]);
    }
});

// API endpoint to get a specific document
app.get('/api/documents/:id', (req, res) => {
    const fs = require('fs');
    const documentsDir = path.join(__dirname, '../assets/documents');
    const documentFile = path.join(documentsDir, `${req.params.id}.json`);
    
    try {
        const content = fs.readFileSync(documentFile, 'utf8');
        const doc = JSON.parse(content);
        res.json(doc);
    } catch (err) {
        res.status(404).json({ error: 'Document not found' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// PROGRAMS API - Terminal programs and minigames
// ═══════════════════════════════════════════════════════════════════════════

// API endpoint to list all programs
app.get('/api/programs', (req, res) => {
    const fs = require('fs');
    const programsDir = path.join(__dirname, '../assets/programs');
    
    try {
        if (!fs.existsSync(programsDir)) {
            return res.json([]);
        }
        
        const files = fs.readdirSync(programsDir)
            .filter(f => f.endsWith('.json'));
        
        const programs = files.map(f => {
            try {
                const content = fs.readFileSync(path.join(programsDir, f), 'utf8');
                const prog = JSON.parse(content);
                return {
                    id: prog.id,
                    name: prog.name,
                    type: prog.type,
                    category: prog.category,
                    adventure: prog.adventure,
                    description: prog.description
                };
            } catch (err) {
                console.error(`Error reading program ${f}:`, err);
                return null;
            }
        }).filter(p => p !== null);
        
        res.json(programs);
    } catch (err) {
        console.error('Error listing programs:', err);
        res.json([]);
    }
});

// API endpoint to get a specific program
app.get('/api/programs/:id', (req, res) => {
    const fs = require('fs');
    const programsDir = path.join(__dirname, '../assets/programs');
    const programFile = path.join(programsDir, `${req.params.id}.json`);
    
    try {
        const content = fs.readFileSync(programFile, 'utf8');
        const prog = JSON.parse(content);
        res.json(prog);
    } catch (err) {
        res.status(404).json({ error: 'Program not found' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// LLM EXPORT - Full adventure data export for AI assistants
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Export all adventure data for LLM consumption
 * Returns: world setting, timeline, guide, all scenes, all NPCs, all PCs,
 *          terminals, documents, programs
 */
app.get('/api/export/:adventureId', (req, res) => {
    const fs = require('fs');
    const adventureId = req.params.adventureId;
    
    // Build the export object
    const exportData = {
        exportedAt: new Date().toISOString(),
        adventure: adventureId,
        sections: []
    };
    
    try {
        // 1. World Setting (if exists)
        const settingFile = path.join(__dirname, '../assets/adventures/Cyberpunk_World_Setting.json');
        if (fs.existsSync(settingFile)) {
            const setting = JSON.parse(fs.readFileSync(settingFile, 'utf8'));
            exportData.sections.push({
                type: 'world_setting',
                title: 'World Setting',
                content: setting
            });
        }
        
        // 2. Adventure Timeline (if exists)
        const timelineFile = path.join(__dirname, `../assets/adventures/${adventureId}_Timeline.json`);
        if (fs.existsSync(timelineFile)) {
            const timeline = JSON.parse(fs.readFileSync(timelineFile, 'utf8'));
            exportData.sections.push({
                type: 'timeline',
                title: 'Adventure Timeline',
                content: timeline
            });
        }
        
        // 3. Adventure Guide (includes state_tracking, items, clues)
        const guideFile = path.join(__dirname, `../assets/adventures/${adventureId}_Guide.json`);
        if (fs.existsSync(guideFile)) {
            const guide = JSON.parse(fs.readFileSync(guideFile, 'utf8'));
            exportData.sections.push({
                type: 'guide',
                title: 'Adventure Guide',
                content: guide
            });
            
            // 3a. Extract state_tracking as separate section for easy access
            if (guide.state_tracking) {
                exportData.sections.push({
                    type: 'state_tracking',
                    title: 'Campaign Flags',
                    count: guide.state_tracking.flags?.length || 0,
                    content: guide.state_tracking
                });
            }
            
            // 3b. Extract items as separate section for easy access
            if (guide.items) {
                exportData.sections.push({
                    type: 'items',
                    title: 'Item Database',
                    count: guide.items.content?.length || 0,
                    content: guide.items
                });
            }
            
            // 3c. Extract clues as separate section for easy access
            if (guide.clues) {
                exportData.sections.push({
                    type: 'clues',
                    title: 'Clue Database',
                    count: guide.clues.content?.length || 0,
                    content: guide.clues
                });
            }
        }
        
        // 4. All Scenes for this adventure
        const scenesDir = path.join(__dirname, '../assets/scene_backgrounds');
        if (fs.existsSync(scenesDir)) {
            const sceneFiles = fs.readdirSync(scenesDir)
                .filter(f => f.startsWith(adventureId) && f.endsWith('.json'))
                .sort(); // Ensure order
            
            const scenes = sceneFiles.map(f => {
                try {
                    return JSON.parse(fs.readFileSync(path.join(scenesDir, f), 'utf8'));
                } catch (err) {
                    console.error(`Error reading scene ${f}:`, err);
                    return null;
                }
            }).filter(s => s !== null);
            
            exportData.sections.push({
                type: 'scenes',
                title: 'Scenes',
                count: scenes.length,
                content: scenes
            });
        }
        
        // 5. All NPCs
        const npcsDir = path.join(__dirname, '../assets/characters/npcs');
        if (fs.existsSync(npcsDir)) {
            const npcFiles = fs.readdirSync(npcsDir).filter(f => f.endsWith('.json'));
            const npcs = npcFiles.map(f => {
                try {
                    return JSON.parse(fs.readFileSync(path.join(npcsDir, f), 'utf8'));
                } catch (err) {
                    console.error(`Error reading NPC ${f}:`, err);
                    return null;
                }
            }).filter(n => n !== null);
            
            exportData.sections.push({
                type: 'npcs',
                title: 'NPC Statblocks',
                count: npcs.length,
                content: npcs
            });
        }
        
        // 6. All PCs (if any)
        const pcsDir = path.join(__dirname, '../assets/characters/players');
        if (fs.existsSync(pcsDir)) {
            const pcFiles = fs.readdirSync(pcsDir).filter(f => f.endsWith('.json'));
            if (pcFiles.length > 0) {
                const pcs = pcFiles.map(f => {
                    try {
                        return JSON.parse(fs.readFileSync(path.join(pcsDir, f), 'utf8'));
                    } catch (err) {
                        console.error(`Error reading PC ${f}:`, err);
                        return null;
                    }
                }).filter(p => p !== null);
                
                exportData.sections.push({
                    type: 'pcs',
                    title: 'Player Characters',
                    count: pcs.length,
                    content: pcs
                });
            }
        }
        
        // 7. All Terminals
        const terminalsDir = path.join(__dirname, '../assets/terminals');
        if (fs.existsSync(terminalsDir)) {
            const terminalFiles = fs.readdirSync(terminalsDir).filter(f => f.endsWith('.json'));
            const terminals = terminalFiles.map(f => {
                try {
                    return JSON.parse(fs.readFileSync(path.join(terminalsDir, f), 'utf8'));
                } catch (err) {
                    console.error(`Error reading terminal ${f}:`, err);
                    return null;
                }
            }).filter(t => t !== null);
            
            if (terminals.length > 0) {
                exportData.sections.push({
                    type: 'terminals',
                    title: 'Terminal Systems',
                    count: terminals.length,
                    content: terminals
                });
            }
        }
        
        // 8. All Documents
        const documentsDir = path.join(__dirname, '../assets/documents');
        if (fs.existsSync(documentsDir)) {
            const documentFiles = fs.readdirSync(documentsDir).filter(f => f.endsWith('.json'));
            const documents = documentFiles.map(f => {
                try {
                    return JSON.parse(fs.readFileSync(path.join(documentsDir, f), 'utf8'));
                } catch (err) {
                    console.error(`Error reading document ${f}:`, err);
                    return null;
                }
            }).filter(d => d !== null);
            
            if (documents.length > 0) {
                exportData.sections.push({
                    type: 'documents',
                    title: 'In-Game Documents',
                    count: documents.length,
                    content: documents
                });
            }
        }
        
        // 9. All Programs
        const programsDir = path.join(__dirname, '../assets/programs');
        if (fs.existsSync(programsDir)) {
            const programFiles = fs.readdirSync(programsDir).filter(f => f.endsWith('.json'));
            const programs = programFiles.map(f => {
                try {
                    return JSON.parse(fs.readFileSync(path.join(programsDir, f), 'utf8'));
                } catch (err) {
                    console.error(`Error reading program ${f}:`, err);
                    return null;
                }
            }).filter(p => p !== null);
            
            if (programs.length > 0) {
                exportData.sections.push({
                    type: 'programs',
                    title: 'Terminal Programs',
                    count: programs.length,
                    content: programs
                });
            }
        }
        
        res.json(exportData);
        
    } catch (err) {
        console.error('Error exporting adventure:', err);
        res.status(500).json({ error: 'Failed to export adventure data' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// DICE SETTINGS API - Player dice appearance customization
// ═══════════════════════════════════════════════════════════════════════════

// In-memory storage for GM default dice settings
// In production, this would be persisted to a database or file
let gmDefaultDiceSettings = {
    theme: 'default',
    themeColor: '#5e8cc9',
    scale: 6,
    gravity: 2,
    mass: 1,
    friction: 0.8,
    restitution: 0.5,
    linearDamping: 0.5,
    angularDamping: 0.4,
    spinForce: 5,
    throwForce: 5,
    startingHeight: 10,
    settleTimeout: 5000
};

// Ensure JSON body parsing is available
app.use(express.json());

/**
 * Get GM default dice settings
 * GET /api/dice/defaults
 * 
 * Returns the default dice appearance settings that new players receive.
 */
app.get('/api/dice/defaults', (req, res) => {
    res.json(gmDefaultDiceSettings);
});

/**
 * Update GM default dice settings (GM only)
 * PUT /api/dice/defaults
 * Body: { theme, themeColor, scale, ... }
 * 
 * Sets the default dice appearance for new players.
 * Requires GM authentication (checked via session or header).
 */
app.put('/api/dice/defaults', (req, res) => {
    // In a real implementation, verify GM authentication here
    // For now, we'll accept any update
    
    const allowedFields = [
        'theme', 'themeColor', 'scale', 'gravity', 'mass',
        'friction', 'restitution', 'linearDamping', 'angularDamping',
        'spinForce', 'throwForce', 'startingHeight', 'settleTimeout'
    ];
    
    const updates = {};
    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    }
    
    gmDefaultDiceSettings = { ...gmDefaultDiceSettings, ...updates };
    
    console.log('[DiceSettings] GM defaults updated:', updates);
    
    res.json({
        success: true,
        settings: gmDefaultDiceSettings
    });
});

/**
 * Get available dice themes
 * GET /api/dice/themes
 * 
 * Returns list of available dice themes from the assets folder.
 */
app.get('/api/dice/themes', (req, res) => {
    const themesDir = path.join(__dirname, '../public/assets/themes');
    
    try {
        if (!fs.existsSync(themesDir)) {
            return res.json([{ id: 'default', name: 'Default Colors' }]);
        }
        
        const dirs = fs.readdirSync(themesDir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => {
                const configPath = path.join(themesDir, d.name, 'theme.config.json');
                try {
                    if (fs.existsSync(configPath)) {
                        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                        return {
                            id: config.systemName || d.name,
                            name: config.name || d.name,
                            author: config.author,
                            diceAvailable: config.diceAvailable || []
                        };
                    }
                } catch (err) {
                    console.error(`Error reading theme config for ${d.name}:`, err);
                }
                return { id: d.name, name: d.name };
            });
        
        res.json(dirs);
    } catch (err) {
        console.error('Error listing dice themes:', err);
        res.json([{ id: 'default', name: 'Default Colors' }]);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// SYNC SYSTEM - Multiplayer state synchronization
// ═══════════════════════════════════════════════════════════════════════════

// Connected users: socketId → { id, name, role, view, sessionId }
const users = new Map();

// Sessions/rooms: sessionId → { gm: socketId, players: Set<socketId> }
const sessions = new Map();

// GM password (in production, use environment variable)
const GM_PASSWORD = process.env.GM_PASSWORD || 'gm123';

// Message types (must match client)
const MessageType = {
    JOIN: 'sync:join',
    LEAVE: 'sync:leave',
    PRESENCE: 'sync:presence',
    VIEW_CHANGE: 'sync:view_change',
    CHAT: 'sync:chat',
    ROLL: 'sync:roll',
    SCENE_CHANGE: 'sync:scene_change',
    SCENE_REQUEST: 'sync:scene_request',
    STATE_SYNC: 'sync:state',
    STATE_REQUEST: 'sync:state_request',
    PING: 'sync:ping',
    PONG: 'sync:pong',
    ERROR: 'sync:error',
    ECHO_REQUEST: 'sync:echo_request',
    ECHO_RESPONSE: 'sync:echo_response'
};

/**
 * Get or create a session
 */
function getSession(sessionId) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            gm: null,
            players: new Set(),
            scene: null,
            state: {}
        });
    }
    return sessions.get(sessionId);
}

/**
 * Broadcast presence update to all users in a session
 */
function broadcastPresence(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return;
    
    const userList = [];
    for (const [id, user] of users) {
        if (user.sessionId === sessionId) {
            userList.push({
                id: user.id,
                name: user.name,
                role: user.role,
                view: user.view
            });
        }
    }
    
    io.to(sessionId).emit(MessageType.PRESENCE, { users: userList });
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('[Sync] Client connected:', socket.id);
    
    // ─────────────────────────────────────────────────────────────────────
    // SELF-TEST: Echo request/response for connection validation
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on(MessageType.ECHO_REQUEST, (data) => {
        // Immediately echo back with the same token
        socket.emit(MessageType.ECHO_RESPONSE, {
            token: data.token,
            sentAt: data.sentAt,
            serverTime: Date.now()
        });
        console.log('[Sync] Echo request from', socket.id);
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // PRESENCE: Join, leave, view changes
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on(MessageType.JOIN, (data) => {
        const { name, role, view, sessionId } = data;
        const roomId = sessionId || 'default';
        
        // Store user
        users.set(socket.id, {
            id: socket.id,
            name: name || 'Anonymous',
            role: role || 'player',
            view: view || 'scene',
            sessionId: roomId
        });
        
        // Join socket.io room
        socket.join(roomId);
        
        // Add to session
        const session = getSession(roomId);
        session.players.add(socket.id);
        
        console.log('[Sync] User joined:', name, `(${role})`, 'in session:', roomId);
        
        // Broadcast join to others in session
        socket.to(roomId).emit(MessageType.JOIN, {
            id: socket.id,
            name,
            role,
            view
        });
        
        // Send full presence to the joining user
        broadcastPresence(roomId);
    });
    
    socket.on(MessageType.VIEW_CHANGE, (data) => {
        const user = users.get(socket.id);
        if (!user) return;
        
        user.view = data.view;
        
        // Broadcast to session
        socket.to(user.sessionId).emit(MessageType.VIEW_CHANGE, {
            id: socket.id,
            view: data.view
        });
        
        console.log('[Sync] View change:', user.name, '→', data.view);
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // CHAT: Broadcast messages to session
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on(MessageType.CHAT, (data) => {
        const user = users.get(socket.id);
        if (!user) return;
        
        const message = {
            from: socket.id,
            name: user.name,
            role: user.role,
            text: data.text,
            type: data.type || 'player',
            timestamp: data.timestamp || Date.now()
        };
        
        // Broadcast to everyone in session (including sender for confirmation)
        io.to(user.sessionId).emit(MessageType.CHAT, message);
        
        console.log('[Sync] Chat:', user.name, ':', data.text);
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // DICE: Broadcast rolls to session
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on(MessageType.ROLL, (data) => {
        const user = users.get(socket.id);
        if (!user) return;
        
        const roll = {
            from: socket.id,
            name: user.name,
            expression: data.expression,
            rolls: data.rolls,
            total: data.total,
            kept: data.kept,
            modifier: data.modifier,
            timestamp: data.timestamp || Date.now()
        };
        
        // Broadcast to everyone in session
        io.to(user.sessionId).emit(MessageType.ROLL, roll);
        
        console.log('[Sync] Roll:', user.name, ':', data.expression, '=', data.total);
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // SCENE: GM pushes scene changes to players
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on(MessageType.SCENE_CHANGE, (data) => {
        const user = users.get(socket.id);
        if (!user || user.role !== 'gm') {
            socket.emit(MessageType.ERROR, { message: 'Only GM can change scenes' });
            return;
        }
        
        const session = sessions.get(user.sessionId);
        if (session) {
            session.scene = data.scene;
        }
        
        // Broadcast to all players in session
        io.to(user.sessionId).emit(MessageType.SCENE_CHANGE, {
            from: socket.id,
            scene: data.scene,
            transition: data.transition
        });
        
        console.log('[Sync] Scene change:', data.scene);
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // GM AUTHENTICATION
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on('gm:authenticate', (data, callback) => {
        const user = users.get(socket.id);
        if (!user) {
            callback({ success: false, message: 'Not connected' });
            return;
        }
        
        if (data.password === GM_PASSWORD) {
            user.role = 'gm';
            
            const session = sessions.get(user.sessionId);
            if (session) {
                session.gm = socket.id;
            }
            
            console.log('[Sync] GM authenticated:', user.name);
            
            // Broadcast role change
            broadcastPresence(user.sessionId);
            
            callback({ success: true });
        } else {
            console.log('[Sync] GM auth failed for:', user.name);
            callback({ success: false, message: 'Invalid password' });
        }
    });
    
    socket.on('gm:logout', () => {
        const user = users.get(socket.id);
        if (!user) return;
        
        user.role = 'player';
        
        const session = sessions.get(user.sessionId);
        if (session && session.gm === socket.id) {
            session.gm = null;
        }
        
        broadcastPresence(user.sessionId);
        console.log('[Sync] GM logout:', user.name);
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // PING/PONG for latency measurement
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on(MessageType.PING, (data) => {
        socket.emit(MessageType.PONG, { sentAt: data.sentAt });
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────────────────────────────────
    
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        
        if (user) {
            const session = sessions.get(user.sessionId);
            if (session) {
                session.players.delete(socket.id);
                if (session.gm === socket.id) {
                    session.gm = null;
                }
            }
            
            // Broadcast leave to session
            socket.to(user.sessionId).emit(MessageType.LEAVE, {
                id: socket.id
            });
            
            console.log('[Sync] User left:', user.name);
            users.delete(socket.id);
        } else {
            console.log('[Sync] Client disconnected:', socket.id);
        }
    });
});

// Start server
httpServer.listen(PORT, () => {
    console.log(`Light Deck running at http://localhost:${PORT}`);
});
