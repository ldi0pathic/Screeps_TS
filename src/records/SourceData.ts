export class SourceData {
    public sourceId: Id<Source>;
    public containerId: Id<StructureContainer> | undefined;
    public linkId: Id<StructureLink> | undefined;

    constructor(sourceId: Id<Source>) {
        this.sourceId = sourceId;
    }
}