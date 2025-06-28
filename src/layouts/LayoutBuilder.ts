export class LayoutBuilder {
    private layout: MinRoomLayout;
    private readonly roomName: string;
    private readonly maxConstructionSites = 25;

    constructor(roomName: string, layout: MinRoomLayout) {
        this.roomName = roomName;
        this.layout = layout;
    }

    /**
     * Mapping von Layout-Strukturnamen zu Screeps-Strukturkonstanten
     */
    private getStructureTypeMapping(): Record<string, BuildableStructureConstant> {
        return {
            'spawn': STRUCTURE_SPAWN,
            'extension': STRUCTURE_EXTENSION,
            'road': STRUCTURE_ROAD,
            'constructedWall': STRUCTURE_WALL,
            'rampart': STRUCTURE_RAMPART,
            'link': STRUCTURE_LINK,
            'storage': STRUCTURE_STORAGE,
            'tower': STRUCTURE_TOWER,
            'observer': STRUCTURE_OBSERVER,
            'powerSpawn': STRUCTURE_POWER_SPAWN,
            'extractor': STRUCTURE_EXTRACTOR,
            'lab': STRUCTURE_LAB,
            'terminal': STRUCTURE_TERMINAL,
            'container': STRUCTURE_CONTAINER,
            'nuker': STRUCTURE_NUKER,
            'factory': STRUCTURE_FACTORY
        };
    }

    /**
     * Überprüft, ob eine Struktur für das aktuelle RCL gebaut werden kann
     */
    private canBuildAtRCL(structureType: BuildableStructureConstant, room: Room): boolean {
        const rcl = room.controller?.level || 0;

        const rclRequirements: Record<BuildableStructureConstant, number> = {
            [STRUCTURE_SPAWN]: 1,
            [STRUCTURE_EXTENSION]: 2,
            [STRUCTURE_ROAD]: 1,
            [STRUCTURE_WALL]: 2,
            [STRUCTURE_RAMPART]: 2,
            [STRUCTURE_CONTAINER]: 1,
            [STRUCTURE_TOWER]: 3,
            [STRUCTURE_STORAGE]: 4,
            [STRUCTURE_LINK]: 5,
            [STRUCTURE_EXTRACTOR]: 6,
            [STRUCTURE_LAB]: 6,
            [STRUCTURE_TERMINAL]: 6,
            [STRUCTURE_OBSERVER]: 8,
            [STRUCTURE_POWER_SPAWN]: 8,
            [STRUCTURE_NUKER]: 8,
            [STRUCTURE_FACTORY]: 7
        };

        return rcl >= (rclRequirements[structureType] || 8);
    }

    /**
     * Gibt die maximale Anzahl einer Struktur für das aktuelle RCL zurück
     */
    private getMaxStructuresAtRCL(structureType: BuildableStructureConstant, room: Room): number {
        const rcl = room.controller?.level || 0;

        // Strukturen mit RCL-abhängigen Limits
        // @ts-ignore
        const structureLimits: Record<BuildableStructureConstant, Record<number, number>> = {
            [STRUCTURE_SPAWN]: {
                1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 3
            },
            [STRUCTURE_EXTENSION]: {
                1: 0, 2: 5, 3: 10, 4: 20, 5: 30, 6: 40, 7: 50, 8: 60
            },
            [STRUCTURE_TOWER]: {
                1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 6
            },
            [STRUCTURE_LINK]: {
                1: 0, 2: 0, 3: 0, 4: 0, 5: 2, 6: 3, 7: 4, 8: 6
            },
            [STRUCTURE_LAB]: {
                1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 3, 7: 6, 8: 10
            },
            [STRUCTURE_CONTAINER]: {
                1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5
            },
        };

        // Strukturen mit festem Limit (1 pro Raum)
        const singleStructures: BuildableStructureConstant[] = [
            STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_OBSERVER,
            STRUCTURE_POWER_SPAWN, STRUCTURE_NUKER, STRUCTURE_FACTORY, STRUCTURE_EXTRACTOR
        ];

        // Strukturen ohne Limit
        const unlimitedStructures: BuildableStructureConstant[] = [STRUCTURE_ROAD, STRUCTURE_WALL, STRUCTURE_RAMPART];

        if (structureLimits[structureType]) {
            return structureLimits[structureType][rcl] || 0;
        }

        if (singleStructures.includes(structureType)) {
            return this.canBuildAtRCL(structureType, room) ? 1 : 0;
        }

        if (unlimitedStructures.includes(structureType)) {
            return this.canBuildAtRCL(structureType, room) ? Infinity : 0;
        }

        return 0;
    }

    /**
     * Zählt existierende Strukturen eines bestimmten Typs im Raum
     */
    private countExistingStructures(structureType: BuildableStructureConstant, room: Room): number {
        const structures = room.find(FIND_STRUCTURES, {
            filter: (s) => s.structureType === structureType
        });

        const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES, {
            filter: (s) => s.structureType === structureType
        });

        return structures.length + constructionSites.length;
    }

    /**
     * Überprüft, ob noch eine weitere Struktur dieses Typs gebaut werden kann
     */
    private canBuildMoreStructures(structureType: BuildableStructureConstant, room: Room): boolean {
        const maxAllowed = this.getMaxStructuresAtRCL(structureType, room);
        const currentCount = this.countExistingStructures(structureType, room);

        return currentCount < maxAllowed;
    }

    /**
     * Zählt aktuelle Baustellen im Raum
     */
    private getConstructionSiteCount(room: Room): number {
        return room.find(FIND_MY_CONSTRUCTION_SITES).length;
    }

    /**
     * Überprüft, ob bereits eine Struktur des gewünschten Typs an der Position existiert
     */
    private structureExistsAtPosition(x: number, y: number, structureType: BuildableStructureConstant, room: Room): boolean {
        const structures = room.lookForAt(LOOK_STRUCTURES, x, y);
        return structures.some(s => s.structureType === structureType);
    }

    /**
     * Entfernt störende Strukturen (hauptsächlich Roads) an einer Position
     */
    private removeBlockingStructures(x: number, y: number, targetStructureType: BuildableStructureConstant, room: Room): boolean {
        const structures = room.lookForAt(LOOK_STRUCTURES, x, y);

        for (const structure of structures) {
            // Roads können mit Ramparts koexistieren
            if (targetStructureType === STRUCTURE_RAMPART && structure.structureType === STRUCTURE_ROAD) {
                continue;
            }

            // Wenn wir eine Road bauen wollen, entfernen wir keine anderen Strukturen
            if (targetStructureType === STRUCTURE_ROAD) {
                continue;
            }

            // Entferne Roads für andere Strukturen
            if (structure.structureType === STRUCTURE_ROAD) {
                const result = structure.destroy();
                if (result === OK) {
                    console.log(`Road at (${x},${y}) entfernt für ${targetStructureType}`);
                    return true;
                } else {
                    console.log(`Fehler beim Entfernen der Road at (${x},${y}): ${result}`);
                }
            }
        }

        return false;
    }

    /**
     * Überprüft, ob eine Position für eine Struktur gültig ist
     */
    private isValidPosition(x: number, y: number, structureType: BuildableStructureConstant, room: Room): boolean {
        if (x < 0 || x > 49 || y < 0 || y > 49) {
            return false;
        }

        // Prüfe RCL-Anforderungen
        if (!this.canBuildAtRCL(structureType, room)) {
            return false;
        }

        // Prüfe Struktur-Limits für aktuelles RCL
        if (!this.canBuildMoreStructures(structureType, room)) {
            return false;
        }

        // Prüfe, ob die Struktur bereits existiert
        if (this.structureExistsAtPosition(x, y, structureType, room)) {
            return false;
        }

        // Prüfe Terrain (Wände können nicht bebaut werden, außer bei Roads)
        const terrain = new Room.Terrain(this.roomName);
        const terrainType = terrain.get(x, y);

        if ((terrainType & TERRAIN_MASK_WALL) && structureType !== STRUCTURE_ROAD) {
            return false;
        }

        // Prüfe bereits existierende Baustellen
        const existingSites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
        if (existingSites.some(s => s.structureType === structureType)) {
            return false;
        }

        // Prüfe bereits existierende Strukturen
        const existingStructures = room.lookForAt(LOOK_STRUCTURES, x, y);

        // Roads können mit anderen Strukturen koexistieren
        if (structureType === STRUCTURE_ROAD) {
            return !existingStructures.some(s => s.structureType === STRUCTURE_ROAD) &&
                !existingSites.some(s => s.structureType === STRUCTURE_ROAD);
        }

        // Ramparts können auf Roads gebaut werden
        if (structureType === STRUCTURE_RAMPART) {
            const nonRoadStructures = existingStructures.filter(s => s.structureType !== STRUCTURE_ROAD);
            const nonRoadSites = existingSites.filter(s => s.structureType !== STRUCTURE_ROAD);
            return nonRoadStructures.length === 0 && nonRoadSites.length === 0;
        }

        // Andere Strukturen brauchen freie Plätze (außer Roads können entfernt werden)
        const blockingStructures = existingStructures.filter(s => s.structureType !== STRUCTURE_ROAD);
        const blockingSites = existingSites.filter(s => s.structureType !== STRUCTURE_ROAD);

        return blockingStructures.length === 0 && blockingSites.length === 0;
    }

    /**
     * Baut eine einzelne Struktur
     */
    private buildStructure(x: number, y: number, structureType: BuildableStructureConstant): ScreepsReturnCode {
        const room = Game.rooms[this.roomName];
        if (!room) {
            return ERR_INVALID_TARGET;
        }

        // Prüfe Baustellen-Limit
        if (this.getConstructionSiteCount(room) >= this.maxConstructionSites) {
            return ERR_FULL;
        }

        // Validierung
        if (!this.isValidPosition(x, y, structureType, room)) {
            return ERR_INVALID_TARGET;
        }

        // Entferne störende Strukturen falls nötig
        this.removeBlockingStructures(x, y, structureType, room);

        // Baustelle erstellen
        return room.createConstructionSite(x, y, structureType);
    }

    /**
     * Baut alle Strukturen eines bestimmten Typs
     */
    private buildStructureType(structureTypeName: string, positions: Position[]): BuildResult {
        const result: BuildResult = {
            success: 0,
            failed: 0,
            errors: []
        };

        const room = Game.rooms[this.roomName];
        if (!room) {
            result.errors.push(`Raum ${this.roomName} nicht verfügbar`);
            return result;
        }

        const typeMapping = this.getStructureTypeMapping();
        const structureType = typeMapping[structureTypeName];

        if (!structureType) {
            result.errors.push(`Unbekannter Strukturtyp: ${structureTypeName}`);
            result.failed = positions.length;
            return result;
        }

        // Sortiere Positionen nach Priorität (Roads zuerst, dann wichtige Strukturen)
        const sortedPositions = this.sortPositionsByPriority(positions, structureType);

        for (const pos of sortedPositions) {
            // Prüfe Baustellen-Limit vor jedem Build-Versuch
            if (this.getConstructionSiteCount(room) >= this.maxConstructionSites) {
                result.errors.push(`Baustellen-Limit von ${this.maxConstructionSites} erreicht`);
                result.failed += sortedPositions.length - result.success;
                break;
            }

            const buildResult = this.buildStructure(pos.x, pos.y, structureType);

            if (buildResult === OK) {
                result.success++;
            } else if (buildResult === ERR_FULL) {
                result.errors.push(`Baustellen-Limit erreicht bei ${structureTypeName}`);
                result.failed += sortedPositions.length - result.success;
                break;
            } else {
                result.failed++;
                result.errors.push(`Fehler beim Bauen von ${structureTypeName} at (${pos.x},${pos.y}): ${buildResult}`);
            }
        }

        return result;
    }

    /**
     * Sortiert Positionen nach Build-Priorität
     */
    private sortPositionsByPriority(positions: Position[], structureType: BuildableStructureConstant): Position[] {
        if (structureType !== STRUCTURE_EXTENSION) {
            return positions;
        }

        // Extensions: Nähe zu Spawns priorisieren
        return positions.sort((a, b) => {
            const room = Game.rooms[this.roomName];
            if (!room) return 0;

            const spawns = room.find(FIND_MY_SPAWNS);
            if (spawns.length === 0) return 0;

            // Finde nächsten Spawn für beide Positionen
            const distanceA = Math.min(...spawns.map(spawn =>
                Math.max(Math.abs(a.x - spawn.pos.x), Math.abs(a.y - spawn.pos.y))
            ));
            const distanceB = Math.min(...spawns.map(spawn =>
                Math.max(Math.abs(b.x - spawn.pos.x), Math.abs(b.y - spawn.pos.y))
            ));

            // Nähere Extensions haben Priorität
            return distanceA - distanceB;
        });
    }

    /**
     * Baut alle Strukturen aus dem Layout (mit RCL-Filterung)
     */
    public buildAll(): BuildResult {
        const totalResult: BuildResult = {
            success: 0,
            failed: 0,
            errors: []
        };

        const room = Game.rooms[this.roomName];
        if (!room) {
            totalResult.errors.push(`Raum ${this.roomName} nicht verfügbar`);
            return totalResult;
        }

        const rcl = room.controller?.level || 0;
        console.log(`Starte Layout-Build für Raum ${this.roomName} (RCL ${rcl})`);

        // Baue in sinnvoller Reihenfolge: Roads zuerst, dann wichtige Strukturen
        const buildOrder = ['road', 'spawn', 'extension', 'container', 'tower', 'storage', 'link',
            'terminal', 'extractor', 'lab', 'factory', 'observer', 'powerSpawn',
            'nuker', 'constructedWall', 'rampart'];

        for (const structureTypeName of buildOrder) {
            const positions = this.layout.buildings[structureTypeName];
            if (positions && positions.length > 0) {
                console.log(`Baue ${positions.length} ${structureTypeName}(s)...`);
                const result = this.buildStructureType(structureTypeName, positions);

                totalResult.success += result.success;
                totalResult.failed += result.failed;
                totalResult.errors.push(...result.errors);

                console.log(`${structureTypeName}: ${result.success} erfolgreich, ${result.failed} fehlgeschlagen`);

                // Stoppe wenn Baustellen-Limit erreicht
                if (this.getConstructionSiteCount(room) >= this.maxConstructionSites) {
                    console.log(`Baustellen-Limit von ${this.maxConstructionSites} erreicht, stoppe Build`);
                    break;
                }
            }
        }

        console.log(`Build abgeschlossen: ${totalResult.success} erfolgreich, ${totalResult.failed} fehlgeschlagen`);
        console.log(`Aktuelle Baustellen: ${this.getConstructionSiteCount(room)}/${this.maxConstructionSites}`);

        if (totalResult.errors.length > 0) {
            console.log(`Fehler:`, totalResult.errors);
        }

        return totalResult;
    }

    /**
     * Baut nur Strukturen eines bestimmten Typs
     */
    public buildStructureTypeOnly(structureTypeName: string): BuildResult {
        const positions = this.layout.buildings[structureTypeName];
        if (!positions || positions.length === 0) {
            return {
                success: 0,
                failed: 0,
                errors: [`Keine ${structureTypeName} im Layout gefunden`]
            };
        }

        return this.buildStructureType(structureTypeName, positions);
    }

    /**
     * Gibt Informationen über das Layout für das aktuelle RCL zurück
     */
    public getLayoutInfo(): {
        totalStructures: number,
        buildableAtCurrentRCL: number,
        currentRCL: number,
        totalBuilding: number,
        structureBreakdown: Record<string, { total: number, buildable: number, existing: number, maxAllowed: number }>
    } {
        const room = Game.rooms[this.roomName];
        const rcl = room?.controller?.level || 0;

        let totalStructures = 0;
        let totalBuilding = 0;
        let buildableAtCurrentRCL = 0;

        const typeMapping = this.getStructureTypeMapping();
        const structureBreakdown: Record<string, { total: number, buildable: number, existing: number, maxAllowed: number }> = {};

        for (const [typeName, positions] of Object.entries(this.layout.buildings)) {
            if (positions && positions.length > 0) {
                const structureType = typeMapping[typeName];
                const total = positions.length;
                totalStructures += total;

                let buildable = 0;
                let existing = 0;
                let maxAllowed = 0;

                if (structureType && room) {
                    maxAllowed = this.getMaxStructuresAtRCL(structureType, room);
                    existing = this.countExistingStructures(structureType, room);
                    totalBuilding += this.getConstructionSiteCount(room);

                    if (this.canBuildAtRCL(structureType, room)) {
                        // Berechne wie viele noch gebaut werden können
                        const remainingSlots = Math.max(0, maxAllowed - existing);
                        buildable = Math.min(total, remainingSlots);
                        buildableAtCurrentRCL += buildable;
                    }
                }

                structureBreakdown[typeName] = {
                    total,
                    buildable,
                    existing,
                    maxAllowed: maxAllowed === Infinity ? -1 : maxAllowed // -1 bedeutet unbegrenzt
                };
            }
        }

        return {
            totalStructures,
            buildableAtCurrentRCL,
            currentRCL: rcl,
            totalBuilding,
            structureBreakdown
        };
    }

    /**
     * Zeigt eine detaillierte Übersicht über den aktuellen Build-Status
     */
    public printBuildStatus(): void {
        const info = this.getLayoutInfo();
        const room = Game.rooms[this.roomName];

        console.log(`\n=== Build Status für ${this.roomName} (RCL ${info.currentRCL}) ===`);
        console.log(`Gesamt im Layout: ${info.totalStructures}`);
        console.log(`Baubar bei RCL ${info.currentRCL}: ${info.buildableAtCurrentRCL}`);
        console.log(`Aktuelle Baustellen: ${room ? this.getConstructionSiteCount(room) : 0}/${this.maxConstructionSites}`);

        console.log('\nStruktur-Details:');
        for (const [typeName, details] of Object.entries(info.structureBreakdown)) {
            const maxStr = details.maxAllowed === -1 ? '∞' : details.maxAllowed.toString();
            const status = details.buildable > 0 ? '✓' :
                details.existing >= details.maxAllowed && details.maxAllowed !== -1 ? '✓ (Max erreicht)' :
                    '✗ (RCL zu niedrig)';

            console.log(`  ${typeName}: ${details.existing}/${maxStr} (${details.buildable} baubar) ${status}`);
        }
        console.log('');
    }

    /**
     * Visualisiert das komplette Layout mit ungebauten Strukturen
     */
    public visualizeUnbuiltLayout(): void {
        const room = Game.rooms[this.roomName];
        if (!room) {
            console.log(`Raum ${this.roomName} nicht verfügbar`);
            return;
        }

        const visual = room.visual;
        const typeMapping = this.getStructureTypeMapping();

        // Farben und Symbole für verschiedene Strukturtypen
        const visualConfig: Record<string, { color: string, symbol: string, size?: number }> = {
            'spawn': {color: '#ffaa00', symbol: 'S', size: 0.8},
            'extension': {color: '#ffdd00', symbol: 'E', size: 0.6},
            'road': {color: '#666666', symbol: '·', size: 0.4},
            'constructedWall': {color: '#000000', symbol: 'W', size: 0.4},
            'rampart': {color: '#00ff00', symbol: 'R', size: 0.6},
            'link': {color: '#0066ff', symbol: 'L', size: 0.6},
            'storage': {color: '#ffff00', symbol: 'St', size: 0.5},
            'tower': {color: '#ff0000', symbol: 'T', size: 0.7},
            'observer': {color: '#ff00ff', symbol: 'O', size: 0.6},
            'powerSpawn': {color: '#ff0080', symbol: 'P', size: 0.6},
            'extractor': {color: '#8080ff', symbol: 'X', size: 0.7},
            'lab': {color: '#00ffff', symbol: 'Lab', size: 0.4},
            'terminal': {color: '#80ff80', symbol: 'Te', size: 0.5},
            'container': {color: '#ffff80', symbol: 'C', size: 0.6},
            'nuker': {color: '#ff8000', symbol: 'N', size: 0.6},
            'factory': {color: '#8000ff', symbol: 'F', size: 0.6}
        };

        let totalUnbuilt = 0;
        let totalVisualized = 0;

        // Durchlaufe alle Strukturtypen im Layout
        for (const [typeName, positions] of Object.entries(this.layout.buildings)) {
            if (!positions || positions.length === 0) continue;

            const structureType = typeMapping[typeName];
            if (!structureType) continue;

            const config = visualConfig[typeName];
            if (!config) continue;

            let unbuiltCount = 0;

            // Prüfe jede Position
            for (const pos of positions) {
                const isBuilt = this.structureExistsAtPosition(pos.x, pos.y, structureType, room);
                const hasConstructionSite = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y)
                    .some(site => site.structureType === structureType);

                // Visualisiere nur ungebaute Strukturen
                if (!isBuilt && !hasConstructionSite) {
                    // Prüfe ob für aktuelles RCL baubar
                    const canBuild = this.canBuildAtRCL(structureType, room) &&
                        this.canBuildMoreStructures(structureType, room);

                    const visualColor = canBuild ? config.color : '#666666';
                    const alpha = canBuild ? 0.8 : 0.4;

                    // Zeichne Struktur-Symbol
                    visual.text(config.symbol, pos.x, pos.y, {
                        color: visualColor,
                        opacity: alpha,
                        font: (config.size || 0.6) + ' Arial',
                        align: 'center'
                    });

                    // Zeichne Hintergrund-Kreis für bessere Sichtbarkeit
                    visual.circle(pos.x, pos.y, {
                        radius: 0.35,
                        fill: visualColor,
                        opacity: alpha * 0.3,
                        stroke: visualColor,
                        strokeWidth: 0.1
                    });

                    unbuiltCount++;
                    totalVisualized++;
                }
            }
        }
    }

    /**
     * Visualisiert nur einen bestimmten Strukturtyp
     */
    public visualizeStructureType(structureTypeName: string): void {
        const room = Game.rooms[this.roomName];
        if (!room) {
            console.log(`Raum ${this.roomName} nicht verfügbar`);
            return;
        }

        const positions = this.layout.buildings[structureTypeName];
        if (!positions || positions.length === 0) {
            console.log(`Keine ${structureTypeName} im Layout gefunden`);
            return;
        }

        const typeMapping = this.getStructureTypeMapping();
        const structureType = typeMapping[structureTypeName];
        if (!structureType) {
            console.log(`Unbekannter Strukturtyp: ${structureTypeName}`);
            return;
        }

        const visual = room.visual;
        let unbuiltCount = 0;
        let existingCount = 0;
        let plannedCount = 0;

        console.log(`\n=== ${structureTypeName} Visualisierung ===`);

        for (const pos of positions) {
            const isBuilt = this.structureExistsAtPosition(pos.x, pos.y, structureType, room);
            const hasConstructionSite = room.lookForAt(LOOK_CONSTRUCTION_SITES, pos.x, pos.y)
                .some(site => site.structureType === structureType);

            if (isBuilt) {
                // Bereits gebaut - grüner Kreis
                visual.circle(pos.x, pos.y, {
                    radius: 0.3,
                    fill: '#00ff00',
                    opacity: 0.6
                });
                existingCount++;
            } else if (hasConstructionSite) {
                // Baustelle - gelber Kreis
                visual.circle(pos.x, pos.y, {
                    radius: 0.3,
                    fill: '#ffff00',
                    opacity: 0.8
                });
                plannedCount++;
            } else {
                // Ungebaut - roter Kreis
                const canBuild = this.canBuildAtRCL(structureType, room) &&
                    this.canBuildMoreStructures(structureType, room);

                visual.circle(pos.x, pos.y, {
                    radius: 0.3,
                    fill: canBuild ? '#ff0000' : '#666666',
                    opacity: canBuild ? 0.8 : 0.4
                });
                unbuiltCount++;
            }

            // Positionsnummer anzeigen
            visual.text((existingCount + plannedCount + unbuiltCount).toString(), pos.x, pos.y + 0.7, {
                color: '#ffffff',
                font: '0.4 Arial',
                align: 'center'
            });
        }

        // Status-Legende
        visual.text(`${structureTypeName} Status:`, 1, 45, {
            color: '#ffffff',
            font: '0.6 Arial bold',
            backgroundColor: '#000000',
            backgroundPadding: 0.1
        });

        visual.text(`🟢 Gebaut: ${existingCount}`, 1, 46, {
            color: '#00ff00',
            font: '0.5 Arial',
            backgroundColor: '#000000',
            backgroundPadding: 0.1
        });

        visual.text(`🟡 Baustelle: ${plannedCount}`, 1, 47, {
            color: '#ffff00',
            font: '0.5 Arial',
            backgroundColor: '#000000',
            backgroundPadding: 0.1
        });

        visual.text(`🔴 Ungebaut: ${unbuiltCount}`, 1, 48, {
            color: '#ff0000',
            font: '0.5 Arial',
            backgroundColor: '#000000',
            backgroundPadding: 0.1
        });

        console.log(`${structureTypeName}: ${existingCount} gebaut, ${plannedCount} Baustellen, ${unbuiltCount} ungebaut`);
    }

    /**
     * Löscht alle Visualisierungen im Raum
     */
    public clearVisualization(): void {
        const room = Game.rooms[this.roomName];
        if (!room) {
            console.log(`Raum ${this.roomName} nicht verfügbar`);
            return;
        }

        room.visual.clear();
        console.log(`Visualisierung für ${this.roomName} gelöscht`);
    }
}

