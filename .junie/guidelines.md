### Build and Configuration Instructions

This project uses Rollup to bundle the TypeScript code for Screeps.

- **Main Build**: Run `npm run build` to compile and bundle the project.
- **Auto-Build (Watch)**: Run `npm run watch` to automatically rebuild on file changes.
- **Deployment**: The `screeps.json` file (if present) is used to configure deployment to various Screeps servers.
- **Environment**: The bot is optimized for **20 CPU** environments. CPU-intensive operations are throttled or cached.

### Testing Information

Testing is performed using Mocha, Chai, and `ts-node`.

- **Run All Unit Tests**: `npm run test-unit`
- **Adding New Tests**:
    - Place new test files in `test/unit/` with the `.test.ts` extension.
    - Tests use Mocha's `describe`/`it` structure.
    - Global Screeps objects (like `Game`, `Memory`, `Room`, etc.) are partially mocked in `test/setup-mocha.js` and `test/unit/mock.ts`.
    - When writing tests for logic that depends on global Screeps objects, ensure you provide necessary mocks in the `beforeEach` block.

#### Example Test (`test/unit/demo.test.ts`):

```typescript
import {assert} from "chai";

describe("Demo Test", () => {
    it("should pass a simple assertion", () => {
        assert.strictEqual(1 + 1, 2);
    });
});
```

### Additional Development Information

#### Code Architecture

- **Managers**: Logic is organized into static Manager classes (e.g., `JobsManager`, `CleanUpManager`) found in `src/manager/`.
- **Storages**: Persistent state and caching are handled by singleton Storage classes (e.g., `LinkStorage`, `CreepStorage`) in `src/storage/`.
- **Roles**: Creep behavior is encapsulated in "Ant" classes in `src/roles/`.
- **Extensions**: Global Screeps objects (like `Room`) are extended with additional methods in `src/extensions/`.

#### Patterns and Practices

- **Memory Cleanup**: Dead creep memory is automatically cleaned by `CleanUpManager.cleanMemory()` in each tick's loop.
- **Caching**: Storages use TTL (Time To Live) caching to minimize expensive `find` calls (e.g., `LinkStorage.CACHE_TTL`).
- **CPU Management**: The `main.ts` loop includes CPU usage logging and bucket monitoring.
- **Global Dependencies**: The project relies on `lodash` (available as `_`) and global type definitions in `src/global.ts`.
