export class ReadingListNameConflictError extends Error {
    public constructor() {
        super("A reading list with this name already exists.");
        this.name = "ReadingListNameConflictError";
    }
}
