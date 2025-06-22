export class EnergieSourceData {
    public sourceId: Id<Source>;
    public containerId: Id<StructureContainer> | undefined;
    public linkId: Id<StructureLink> | undefined;

    constructor(sourceId: Id<Source>) {
        this.sourceId = sourceId;
    }
}

export class MineralSourceData {
    public mineralId: Id<Mineral>;
    public mineralType: MineralConstant;

    public containerId: Id<StructureContainer> | undefined;
    public linkId: Id<StructureLink> | undefined;
    public extractorId: Id<StructureExtractor> | undefined;

    constructor(sourceId: Id<Mineral>, type: MineralConstant) {
        this.mineralId = sourceId;
        this.mineralType = type;
    }
}