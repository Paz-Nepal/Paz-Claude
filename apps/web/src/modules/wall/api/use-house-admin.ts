import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Database } from "@paz/types";
import { selectView } from "@/lib/select-view";
import { callRpc, useAdminRpc } from "./use-wall-admin";

type Views = Database["api"]["Views"];

export type AdminRoom = Views["admin_house_rooms"]["Row"];
export type AdminRoomImage = Views["admin_house_room_images"]["Row"];
export type AdminThing = Views["admin_house_things"]["Row"];
export type AdminWanted = Views["admin_house_wanted"]["Row"];
export type AdminBook = Views["admin_house_books"]["Row"];
export type AdminStudioMonth = Views["admin_house_studio_months"]["Row"];
export type AdminDay = Views["admin_house_days"]["Row"];
export type AdminDayDate = Views["admin_house_day_dates"]["Row"];
export type AdminPlace = Views["admin_encounter_places"]["Row"];
export type AdminPlaceVisit = Views["admin_encounter_place_visits"]["Row"];
export type AdminObject = Views["admin_objects"]["Row"];
export type AdminOffer = Views["offers"]["Row"];
export type AdminAccession = Views["admin_record_accessions"]["Row"];
export type AdminConsentLine = Views["admin_record_consent_lines"]["Row"];
export type AdminPart = Views["admin_record_parts"]["Row"];
export type AdminHousePaper = Views["admin_record_house_papers"]["Row"];
export type AdminClosed = Views["admin_record_closed"]["Row"];
export type AdminPigeonDistribution = Views["admin_pigeon_distribution"]["Row"];

function useAdminView<T>(key: string, view: string, orders: Array<string | [string, boolean]>) {
  return useQuery({ queryKey: [key], queryFn: () => selectView<T>(view, orders) });
}

export const useAdminRooms = () =>
  useAdminView<AdminRoom>("admin-house-rooms", "admin_house_rooms", ["sort", "name"]);
export const useAdminRoomImages = () =>
  useAdminView<AdminRoomImage>("admin-house-room-images", "admin_house_room_images", [
    "room_id",
    "sort",
  ]);
export const useAdminThings = () =>
  useAdminView<AdminThing>("admin-house-things", "admin_house_things", ["name", "id"]);
export const useAdminWanted = () =>
  useAdminView<AdminWanted>("admin-house-wanted", "admin_house_wanted", ["sort", "what"]);
export const useAdminBooks = () =>
  useAdminView<AdminBook>("admin-house-books", "admin_house_books", ["title", "id"]);
export const useAdminStudioMonths = () =>
  useAdminView<AdminStudioMonth>("admin-house-studio-months", "admin_house_studio_months", [
    ["from_on", false],
    "id",
  ]);
export const useAdminDays = () =>
  useAdminView<AdminDay>("admin-house-days", "admin_house_days", ["name", "id"]);
export const useAdminDayDates = () =>
  useAdminView<AdminDayDate>("admin-house-day-dates", "admin_house_day_dates", ["falls_on", "id"]);
export const useAdminPlaces = () =>
  useAdminView<AdminPlace>("admin-encounter-places", "admin_encounter_places", ["name", "id"]);
export const useAdminPlaceVisits = () =>
  useAdminView<AdminPlaceVisit>("admin-encounter-place-visits", "admin_encounter_place_visits", [
    ["done_on", false],
    "id",
  ]);
export const useAdminObjects = () =>
  useAdminView<AdminObject>("admin-objects", "admin_objects", ["sort", "title"]);
export const useAdminOffers = () =>
  useAdminView<AdminOffer>("admin-offers", "offers", [["created_at", false], "id"]);
export const useAdminAccessions = () =>
  useAdminView<AdminAccession>("admin-record-accessions", "admin_record_accessions", [
    ["created_at", false],
    "id",
  ]);
export const useAdminConsentLines = () =>
  useAdminView<AdminConsentLine>("admin-record-consent-lines", "admin_record_consent_lines", [
    "accession_id",
    "recorded_on",
    "created_at",
  ]);
export const useAdminParts = () =>
  useAdminView<AdminPart>("admin-record-parts", "admin_record_parts", ["accession_id", "part_no"]);
export const useAdminHousePapers = () =>
  useAdminView<AdminHousePaper>("admin-record-house-papers", "admin_record_house_papers", [
    "reference",
    "id",
  ]);
export const useAdminClosed = (enabled: boolean) =>
  useQuery({
    queryKey: ["admin-record-closed"],
    enabled,
    queryFn: () => selectView<AdminClosed>("admin_record_closed", ["accession_id"]),
  });
export const useAdminPigeonDistribution = () =>
  useAdminView<AdminPigeonDistribution>("admin-pigeon-distribution", "admin_pigeon_distribution", [
    ["noted_on", false],
    "id",
  ]);

const HOUSE_PUBLIC = [["house-rooms"], ["house-room-images"], ["house-things"], ["house-wanted"]];

export const useSaveRoom = () =>
  useAdminRpc("save_house_room", [["admin-house-rooms"], ...HOUSE_PUBLIC]);
export const useSaveRoomImage = () =>
  useAdminRpc("save_house_room_image", [["admin-house-room-images"], ...HOUSE_PUBLIC]);
export const useRemoveRoomImage = () =>
  useAdminRpc("remove_house_room_image", [["admin-house-room-images"], ...HOUSE_PUBLIC]);
export const useSaveThing = () =>
  useAdminRpc("save_house_thing", [["admin-house-things"], ...HOUSE_PUBLIC]);
export const useSaveWanted = () =>
  useAdminRpc("save_house_wanted", [["admin-house-wanted"], ...HOUSE_PUBLIC]);
export const useSaveBook = () =>
  useAdminRpc("save_house_book", [["admin-house-books"], ["house-books"]]);
export const useSaveStudioMonth = () =>
  useAdminRpc("save_house_studio_month", [["admin-house-studio-months"], ["house-studio-months"]]);
export const useSaveDay = () =>
  useAdminRpc("save_house_day", [["admin-house-days"], ["house-days"]]);
export const useSaveDayDate = () =>
  useAdminRpc("save_house_day_date", [["admin-house-day-dates"], ["house-day-dates"]]);
export const useRemoveDayDate = () =>
  useAdminRpc("remove_house_day_date", [["admin-house-day-dates"], ["house-day-dates"]]);
export const useSavePlace = () =>
  useAdminRpc("save_encounter_place", [["admin-encounter-places"], ["encounter-places"]]);
export const useSavePlaceVisit = () =>
  useAdminRpc("save_encounter_place_visit", [
    ["admin-encounter-place-visits"],
    ["encounter-place-visits"],
  ]);
export const useSaveObject = () => useAdminRpc("save_object", [["admin-objects"], ["objects"]]);
export const useReviewOffer = () => useAdminRpc("review_offer", [["admin-offers"]]);
export const useSavePigeonDistribution = () =>
  useAdminRpc("save_pigeon_distribution", [
    ["admin-pigeon-distribution"],
    ["pigeon-reach"],
    ["pigeon-reach-by-item"],
  ]);
export const useRemovePigeonDistribution = () =>
  useAdminRpc("remove_pigeon_distribution", [
    ["admin-pigeon-distribution"],
    ["pigeon-reach"],
    ["pigeon-reach-by-item"],
  ]);

const RECORD_KEYS = [["admin-record-accessions"], ["record-accessions"], ["record-withdrawn"]];
export const useSaveAccession = () => useAdminRpc("save_record_accession", RECORD_KEYS);
export const useAssignAccessionNumber = () =>
  useAdminRpc("assign_record_accession_number", [
    ...RECORD_KEYS,
    ["admin-record-parts"],
    ["record-parts"],
  ]);
export const useAddConsentLine = () =>
  useAdminRpc("add_record_consent_line", [["admin-record-consent-lines"], ...RECORD_KEYS]);
export const useWithdrawAccession = () =>
  useAdminRpc("withdraw_record_accession", [["admin-record-consent-lines"], ...RECORD_KEYS]);
export const useSavePart = () =>
  useAdminRpc("save_record_part", [["admin-record-parts"], ["record-parts"]]);
export const useRecordListening = () => useAdminRpc("record_listening", RECORD_KEYS);
export const useSaveHousePaper = () =>
  useAdminRpc("save_record_house_paper", [["admin-record-house-papers"], ["record-house-papers"]]);
export const useSaveClosed = () => useAdminRpc("save_record_closed", [["admin-record-closed"]]);

/** Sets or clears the one line that says whether anyone is home. */
export function useSetHouseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { status: string; statusNe: string }) =>
      callRpc("set_house_status", { p_status: args.status, p_status_ne: args.statusNe }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-info"] }),
  });
}
