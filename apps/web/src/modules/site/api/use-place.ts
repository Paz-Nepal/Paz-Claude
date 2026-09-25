import { useMutation, useQuery } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";
import { selectAll } from "@/lib/paged";
import { selectView } from "@/lib/select-view";
import { invokeEdgeFunction } from "@/lib/edge-functions";

type Views = Database["api"]["Views"];

export type HouseRoom = Views["house_rooms"]["Row"];
export type HouseRoomImage = Views["house_room_images"]["Row"];
export type HouseThing = Views["house_things"]["Row"];
export type HouseWanted = Views["house_wanted"]["Row"];
export type HouseBook = Views["house_books"]["Row"];
export type HouseStudioMonth = Views["house_studio_months"]["Row"];
export type HouseDay = Views["house_days"]["Row"];
export type HouseDayDate = Views["house_day_dates"]["Row"];
export type PigeonReach = Views["pigeon_post_reach"]["Row"];
export type PigeonReachByItem = Views["pigeon_post_reach_by_item"]["Row"];
export type EncounterPlace = Views["encounter_places"]["Row"];
export type EncounterPlaceVisit = Views["encounter_place_visits"]["Row"];
export type RecordAccession = Views["record_accessions"]["Row"];
export type RecordPart = Views["record_parts"]["Row"];
export type RecordHousePaper = Views["record_house_papers"]["Row"];
export type ObjectForSale = Views["objects"]["Row"];

const api = () => supabase.schema("api");
const STALE = 60_000;

function useView<T>(queryKey: string[], view: string, orders: string[]) {
  return useQuery({
    queryKey,
    staleTime: STALE,
    queryFn: () => selectView<T>(view, orders),
  });
}

export const useHouseRooms = () =>
  useView<HouseRoom>(["house-rooms"], "house_rooms", ["sort", "name"]);
export const useHouseRoomImages = () =>
  useView<HouseRoomImage>(["house-room-images"], "house_room_images", ["room_id", "sort"]);
export const useHouseThings = () =>
  useView<HouseThing>(["house-things"], "house_things", ["name", "id"]);
export const useHouseWanted = () =>
  useView<HouseWanted>(["house-wanted"], "house_wanted", ["kind", "what"]);
export const useHouseBooks = () =>
  useView<HouseBook>(["house-books"], "house_books", ["title", "id"]);
export const useHouseStudioMonths = () =>
  useView<HouseStudioMonth>(["house-studio-months"], "house_studio_months", ["from_on", "id"]);
export const useHouseDays = () => useView<HouseDay>(["house-days"], "house_days", ["name", "id"]);
export const useHouseDayDates = () =>
  useView<HouseDayDate>(["house-day-dates"], "house_day_dates", ["falls_on", "id"]);
export const usePigeonReach = () =>
  useView<PigeonReach>(["pigeon-reach"], "pigeon_post_reach", ["country", "copies"]);
export const usePigeonReachByItem = () =>
  useView<PigeonReachByItem>(["pigeon-reach-by-item"], "pigeon_post_reach_by_item", [
    "item_slug",
    "country",
  ]);
export const useEncounterPlaces = () =>
  useView<EncounterPlace>(["encounter-places"], "encounter_places", ["name", "id"]);
export const useEncounterPlaceVisits = () =>
  useView<EncounterPlaceVisit>(["encounter-place-visits"], "encounter_place_visits", [
    "done_on",
    "id",
  ]);
export const useRecordAccessions = () =>
  useView<RecordAccession>(["record-accessions"], "record_accessions", ["number", "kind"]);
export const useRecordParts = () =>
  useView<RecordPart>(["record-parts"], "record_parts", ["number", "part_no"]);
export const useRecordHousePapers = () =>
  useView<RecordHousePaper>(["record-house-papers"], "record_house_papers", ["reference", "title"]);
export const useObjects = () => useView<ObjectForSale>(["objects"], "objects", ["title", "id"]);

export function useRecordWithdrawn() {
  return useQuery({
    queryKey: ["record-withdrawn"],
    staleTime: STALE,
    queryFn: () =>
      selectAll<Views["record_withdrawn"]["Row"]>((from, to) =>
        api().from("record_withdrawn").select("*").order("number").range(from, to),
      ),
  });
}

export function useChronicleOnThisDay() {
  return useQuery({
    queryKey: ["chronicle-on-this-day", new Date().toISOString().slice(0, 10)],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await api().from("chronicle_on_this_day").select("*").limit(3);
      if (error) throw toAppError(error);
      return data ?? [];
    },
  });
}

export function useVerifyWork(number: number | null) {
  return useQuery({
    queryKey: ["verify-work", number],
    enabled: number != null && Number.isInteger(number) && number > 0,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await api().rpc("verify_work", { p_number: number as number });
      if (error) throw toAppError(error);
      return (data ?? [])[0] ?? null;
    },
  });
}

export function useVerifyHallmark(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["verify-hallmark", q],
    enabled: q.length > 0,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await api().rpc("verify_hallmark", { p_query: q });
      if (error) throw toAppError(error);
      return data ?? [];
    },
  });
}

/** A number stored either as a number or as text, or not set at all. */
export function settingNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export type OfferKind = "painter" | "sattal" | "table" | "thing" | "book" | "word" | "leaving";

export interface OfferInput {
  kind: OfferKind;
  name: string;
  contact: string;
  subject?: string | undefined;
  note?: string | undefined;
  ref?: Record<string, string>;
}

/** One dependency, and it fails safe: the caller shows a plain line and an alternative address. */
export function useSubmitOffer() {
  return useMutation({
    mutationFn: async (input: OfferInput) => {
      await invokeEdgeFunction<{ ok: true }>("submit-offer", { ...input });
    },
  });
}
