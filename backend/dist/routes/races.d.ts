import { DatabaseService } from '../services/DatabaseService';
import { RaceResultsEditor } from '../services/RaceResultsEditor';
import { Server } from 'socket.io';
declare const router: import("express-serve-static-core").Router;
declare const setupRacesRoutes: (databaseService: DatabaseService, raceEditor: RaceResultsEditor, io: Server) => void;
export { setupRacesRoutes };
export default router;
//# sourceMappingURL=races.d.ts.map