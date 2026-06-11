export class RoomStorage {
    public storageContainerId: Id<StructureContainer>[] | undefined;
    public storageId: Id<StructureStorage> | undefined;
    public sourceContainerIds?: { [sourceId: string]: Id<StructureContainer> };
    public spawnContainerIds?: Id<StructureContainer>[];
    public controllerContainerId?: Id<StructureContainer>;
    public controllerLinkId?: Id<StructureLink>;
    public terminalId?: Id<StructureTerminal>;
    public lastScan?: number;
}
