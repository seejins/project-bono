import type { DatabaseService } from '../DatabaseService';
import { SessionResult } from './types';

export class SeasonRepository {
  constructor(private readonly service: DatabaseService) {}

  ensureInitialized(): Promise<void> {
    return this.service.ensureInitialized();
  }

  getAllSeasons() {
    return this.service.getAllSeasons();
  }

  getHistoricInsights() {
    return this.service.getHistoricInsights();
  }

  getSeasonsForHistory() {
    return this.service.getSeasonsForHistory();
  }

  getPreviousRaceResults(seasonId: string) {
    return this.service.getPreviousRaceResults(seasonId);
  }

  getSeasonById(id: string) {
    return this.service.getSeasonById(id);
  }

  createSeason(data: any) {
    return this.service.createSeason(data);
  }

  updateSeason(id: string, data: any) {
    return this.service.updateSeason(id, data);
  }

  deleteSeason(id: string) {
    return this.service.deleteSeason(id);
  }

  deactivateAllOtherSeasons(id: string) {
    return this.service.deactivateAllOtherSeasons(id);
  }

  setCurrentSeason(id: string) {
    return this.service.setCurrentSeason(id);
  }

  getActiveSeason() {
    return this.service.getActiveSeason();
  }

  getSeasonAnalysis(id: string) {
    return this.service.getSeasonAnalysis(id);
  }

  getConstructorStandings(seasonId: string) {
    return this.service.getConstructorStandings(seasonId);
  }
}

export class DriverRepository {
  constructor(private readonly service: DatabaseService) {}

  ensureInitialized() {
    return this.service.ensureInitialized();
  }

  getAllDrivers() {
    return this.service.getAllDrivers();
  }

  createDriver(data: any) {
    return this.service.createDriver(data);
  }

  getDriverById(id: string) {
    return this.service.getDriverById(id);
  }

  updateDriver(id: string, data: any) {
    return this.service.updateDriver(id, data);
  }

  deleteDriver(id: string) {
    return this.service.deleteDriver(id);
  }

  getDriverCareerProfile(id: string) {
    return this.service.getDriverCareerProfile(id);
  }

  getDriverSeasonStats(id: string, seasonId: string) {
    return this.service.getDriverSeasonStats(id, seasonId);
  }

  getSeasonStandings(seasonId: string) {
    return this.service.getSeasonStandings(seasonId);
  }

  getDriverRaceHistory(id: string, seasonId?: string) {
    return this.service.getDriverRaceHistory(id, seasonId);
  }

  addDriverToSeason(seasonId: string, driverId: string) {
    return this.service.addDriverToSeason(seasonId, driverId);
  }

  removeDriverFromSeason(seasonId: string, driverId: string) {
    return this.service.removeDriverFromSeason(seasonId, driverId);
  }

  updateSeasonParticipant(driverId: string, data: { team?: string; number?: number }) {
    return this.service.updateSeasonParticipant(driverId, data);
  }

  getDriversBySeason(seasonId: string) {
    return this.service.getDriversBySeason(seasonId);
  }

  getDriverMappings(seasonId: string) {
    return this.service.getDriverMappings(seasonId);
  }
}

export class TrackRepository {
  constructor(private readonly service: DatabaseService) {}

  ensureInitialized() {
    return this.service.ensureInitialized();
  }

  getAllTracks() {
    return this.service.getAllTracks();
  }

  getTracksBySeason(seasonId: string) {
    return this.service.getTracksBySeason(seasonId);
  }

  createTrack(data: any) {
    return this.service.createTrack(data);
  }

  createTrackAndAddToSeason(data: any, seasonId: string) {
    return this.service.createTrackAndAddToSeason(data, seasonId);
  }

  getTrackById(id: string) {
    return this.service.getTrackById(id);
  }

  removeTrackFromSeason(seasonId: string, trackId: string) {
    return this.service.removeTrackFromSeason(seasonId, trackId);
  }

  findOrCreateTrack(name: string, lengthKm?: number) {
    return this.service.findOrCreateTrack(name, lengthKm);
  }
}

export class RaceRepository {
  constructor(private readonly service: DatabaseService) {}

  ensureInitialized() {
    return this.service.ensureInitialized();
  }

  getRacesBySeason(seasonId: string) {
    return this.service.getRacesBySeason(seasonId);
  }

  getRaceById(raceId: string) {
    return this.service.getRaceById(raceId);
  }

  createRace(data: any) {
    return this.service.createRace(data);
  }

  addRaceToSeason(data: any) {
    return this.service.addRaceToSeason(data);
  }

  removeRaceFromSeason(raceId: string) {
    return this.service.removeRaceFromSeason(raceId);
  }

  getEventsBySeason(seasonId: string) {
    return this.service.getEventsBySeason(seasonId);
  }

  addEventToSeason(seasonId: string, eventData: any) {
    return this.service.addEventToSeason(seasonId, eventData);
  }

  updateEventInSeason(eventId: string, eventData: any) {
    return this.service.updateEventInSeason(eventId, eventData);
  }

  removeEventFromSeason(eventId: string) {
    return this.service.removeEventFromSeason(eventId);
  }

  updateEventOrder(seasonId: string, orderedEventIds: string[]) {
    return this.service.updateEventOrder(seasonId, orderedEventIds);
  }

  findActiveEventByTrack(trackName: string) {
    return this.service.findActiveEventByTrack(trackName);
  }

  getCurrentEventForSeason(seasonId: string) {
    return this.service.getCurrentEventForSeason(seasonId);
  }

  getSeasonIdFromEvent(eventId: string) {
    return this.service.getSeasonIdFromEvent(eventId);
  }
}

export class SessionRepository {
  constructor(private readonly service: DatabaseService) {}

  ensureInitialized() {
    return this.service.ensureInitialized();
  }

  importSessionResults(raceId: string, results: SessionResult[]) {
    return this.service.importSessionResults(raceId, results);
  }

  getSessionResultsByRace(raceId: string) {
    return this.service.getSessionResultsByRace(raceId);
  }

  storeF123SessionResults(raceId: string, sessionType: number, results: any[]) {
    return this.service.storeF123SessionResults(raceId, sessionType, results);
  }

  getMemberCareerStats(memberId: string) {
    return this.service.getMemberCareerStats(memberId);
  }

  importRaceResults(raceId: string, data: SessionResult[] | { results?: any[] }) {
    return this.service.importRaceResults(raceId, data);
  }

  createSessionResult(
    raceId: string,
    sessionType: number,
    sessionName: string,
    sessionUID: bigint | null,
    additionalData?: any,
  ) {
    return this.service.createSessionResult(raceId, sessionType, sessionName, sessionUID, additionalData);
  }

  getSessionByUID(sessionUID: bigint) {
    return this.service.getSessionByUID(sessionUID);
  }

  deleteDriverSessionResults(sessionResultId: string) {
    return this.service.deleteDriverSessionResults(sessionResultId);
  }

  storeDriverSessionResults(sessionResultId: string, driverResults: any[]) {
    return this.service.storeDriverSessionResults(sessionResultId, driverResults);
  }

  storeLapTimes(driverSessionResultId: string, raceId: string, lapData: any[]) {
    return this.service.storeLapTimes(driverSessionResultId, raceId, lapData);
  }

  getCompletedSessions(raceId: string) {
    return this.service.getCompletedSessions(raceId);
  }

  getDriverSessionResults(sessionResultId: string, includeLapTimes?: boolean) {
    return this.service.getDriverSessionResults(sessionResultId, includeLapTimes);
  }

  deleteOriginalSessionResults(sessionResultId: string) {
    return this.service.deleteOriginalSessionResults(sessionResultId);
  }

  storeOriginalSessionResults(sessionResultId: string, driverResults: any[]) {
    return this.service.storeOriginalSessionResults(sessionResultId, driverResults);
  }

  addPenalty(driverSessionResultId: string, penaltySeconds: number, reason: string, editedBy: string) {
    return this.service.addPenalty(driverSessionResultId, penaltySeconds, reason, editedBy);
  }

  removePenalty(driverSessionResultId: string, penaltyId: string) {
    return this.service.removePenalty(driverSessionResultId, penaltyId);
  }

  recalculatePositions(sessionResultId: string) {
    return this.service.recalculatePositions(sessionResultId);
  }

  changePosition(sessionResultId: string, driverId: string, newPosition: number, reason: string, editedBy: string) {
    return this.service.changePosition(sessionResultId, driverId, newPosition, reason, editedBy);
  }

  resetDriverToOriginal(sessionResultId: string, driverId: string) {
    return this.service.resetDriverToOriginal(sessionResultId, driverId);
  }

  getEditHistory(sessionResultId: string) {
    return this.service.getEditHistory(sessionResultId);
  }

  getEditHistoryForDriver(driverSessionResultId: string) {
    return this.service.getEditHistoryForDriver(driverSessionResultId);
  }

  revertEdit(editId: string) {
    return this.service.revertEdit(editId);
  }
}

export class UDPRepository {
  constructor(private readonly service: DatabaseService) {}

  ensureInitialized() {
    return this.service.ensureInitialized();
  }

  addParticipant(data: any) {
    return this.service.addUDPParticipant(data);
  }

  addSessionResult(data: any) {
    return this.service.addUDPSessionResult(data);
  }

  addTyreStint(data: any) {
    return this.service.addUDPTyreStint(data);
  }

  addLapHistory(data: any) {
    return this.service.addUDPLapHistory(data);
  }

  batchAddLapHistory(lapHistory: any[]) {
    return this.service.batchAddUDPLapHistory(lapHistory);
  }

  getSessionResults() {
    return this.service.getUDPSessionResults();
  }

  getLapHistory(driverId?: string) {
    return this.service.getUDPLapHistory(driverId);
  }

  getParticipantsBySession(sessionUid: bigint) {
    return this.service.getUDPParticipantsBySession(sessionUid);
  }

  getSessionResultsBySession(sessionUid: bigint) {
    return this.service.getUDPSessionResultsBySession(sessionUid);
  }

  getLapHistoryByDriver(driverId: string, sessionUid?: bigint) {
    return this.service.getUDPLapHistoryByDriver(driverId, sessionUid);
  }

  getTyreStintsByDriver(driverId: string, sessionUid?: bigint) {
    return this.service.getUDPTyreStintsByDriver(driverId, sessionUid);
  }
}

export interface AppRepositories {
  seasons: SeasonRepository;
  drivers: DriverRepository;
  tracks: TrackRepository;
  races: RaceRepository;
  sessions: SessionRepository;
  udp: UDPRepository;
}

