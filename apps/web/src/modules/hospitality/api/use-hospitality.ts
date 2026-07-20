import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toAppError, type Database } from "@paz/types";
import { supabase } from "@/lib/supabase";

export type PublicMenuRow = Database["api"]["Views"]["public_menu"]["Row"];
export type ServicePeriod = Database["api"]["Views"]["service_periods"]["Row"];
export type DeskReservation = Database["api"]["Views"]["desk_reservations"]["Row"];
export type MyReservation = Database["api"]["Views"]["my_reservations"]["Row"];
export type TableRow = Database["api"]["Views"]["tables"]["Row"];
export type AdminMenu = Database["api"]["Views"]["admin_menus"]["Row"];
export type AdminMenuSection = Database["api"]["Views"]["admin_menu_sections"]["Row"];
export type AdminMenuItem = Database["api"]["Views"]["admin_menu_items"]["Row"];
export type ReservationStatus = Database["hospitality"]["Enums"]["reservation_status"];

/**
 * `supabase gen types` renders nullable SQL function parameters as
 * non-nullable TS properties (PostgREST itself accepts null for any of
 * them) — same sanctioned cast used throughout the other modules.
 */
function asArgs<T>(args: Record<keyof T & string, unknown>): T {
  return args as T;
}

const api = () => supabase.schema("api");

export function usePublicMenu() {
  return useQuery({
    queryKey: ["public-menu"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await api().from("public_menu").select("*");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useServicePeriods() {
  return useQuery({
    queryKey: ["service-periods"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await api().from("service_periods").select("*");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export interface RequestReservationInput {
  fullName: string;
  email: string | null;
  phone: string | null;
  partySize: number;
  startsAt: string;
  durationMinutes: number;
  notes: string | null;
  occasion: string | null;
}

export function useRequestReservation() {
  return useMutation({
    mutationFn: async (input: RequestReservationInput) => {
      const { data, error } = await api().rpc(
        "request_reservation",
        asArgs<Database["api"]["Functions"]["request_reservation"]["Args"]>({
          p_full_name: input.fullName,
          p_email: input.email,
          p_phone: input.phone,
          p_party_size: input.partySize,
          p_starts_at: input.startsAt,
          p_duration_minutes: input.durationMinutes,
          p_notes: input.notes,
          p_occasion: input.occasion,
        }),
      );
      if (error) throw toAppError(error);
      return data; // the reservation code
    },
  });
}

export function useMyReservations() {
  return useQuery({
    queryKey: ["my-reservations"],
    queryFn: async () => {
      const { data, error } = await api()
        .from("my_reservations")
        .select("*")
        .order("starts_at", { ascending: true });
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useCancelMyReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api().rpc("cancel_my_reservation", { p_id: id });
      if (error) throw toAppError(error);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
    },
  });
}

export function useDeskReservations() {
  return useQuery({
    queryKey: ["desk-reservations"],
    queryFn: async () => {
      const { data, error } = await api().from("desk_reservations").select("*");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export function useSetReservationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      tableId,
    }: {
      id: string;
      status: ReservationStatus;
      tableId: string | null;
    }) => {
      const { error } = await api().rpc(
        "set_reservation_status",
        asArgs<Database["api"]["Functions"]["set_reservation_status"]["Args"]>({
          p_id: id,
          p_status: status,
          p_table_id: tableId,
        }),
      );
      if (error) throw toAppError(error);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["desk-reservations"] });
    },
  });
}

export function useTables() {
  return useQuery({
    queryKey: ["hospitality-tables"],
    queryFn: async () => {
      const { data, error } = await api().from("tables").select("*").order("name");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export interface SaveTableInput {
  id: string | null;
  name: string;
  seats: number;
  zone: string | null;
  active: boolean;
}

export function useSaveTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveTableInput) => {
      const { error } = await api().rpc(
        "save_table",
        asArgs<Database["api"]["Functions"]["save_table"]["Args"]>({
          p_id: input.id,
          p_name: input.name,
          p_seats: input.seats,
          p_zone: input.zone,
          p_active: input.active,
        }),
      );
      if (error) throw toAppError(error);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hospitality-tables"] });
    },
  });
}

export function useAdminMenus() {
  return useQuery({
    queryKey: ["admin-menus"],
    queryFn: async () => {
      const { data, error } = await api().from("admin_menus").select("*");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export interface SaveMenuInput {
  id: string | null;
  slug: string;
  name: string;
  status: string;
  validFrom: string | null;
  validTo: string | null;
}

export function useSaveMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveMenuInput) => {
      const { data, error } = await api().rpc(
        "save_menu",
        asArgs<Database["api"]["Functions"]["save_menu"]["Args"]>({
          p_id: input.id,
          p_slug: input.slug,
          p_name: input.name,
          p_status: input.status,
          p_valid_from: input.validFrom,
          p_valid_to: input.validTo,
        }),
      );
      if (error) throw toAppError(error);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
      void queryClient.invalidateQueries({ queryKey: ["public-menu"] });
    },
  });
}

export function useAdminMenuSections(menuId: string | undefined) {
  return useQuery({
    queryKey: ["admin-menu-sections", menuId],
    enabled: Boolean(menuId),
    queryFn: async () => {
      const { data, error } = await api()
        .from("admin_menu_sections")
        .select("*")
        .eq("menu_id", menuId as string)
        .order("position");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export interface SaveMenuSectionInput {
  id: string | null;
  menuId: string;
  name: string;
  position: number;
}

export function useSaveMenuSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveMenuSectionInput) => {
      const { error } = await api().rpc(
        "save_menu_section",
        asArgs<Database["api"]["Functions"]["save_menu_section"]["Args"]>({
          p_id: input.id,
          p_menu_id: input.menuId,
          p_name: input.name,
          p_position: input.position,
        }),
      );
      if (error) throw toAppError(error);
    },
    onSuccess: (_void, input) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-menu-sections", input.menuId] });
      void queryClient.invalidateQueries({ queryKey: ["public-menu"] });
    },
  });
}

export function useAdminMenuItems(sectionId: string | undefined) {
  return useQuery({
    queryKey: ["admin-menu-items", sectionId],
    enabled: Boolean(sectionId),
    queryFn: async () => {
      const { data, error } = await api()
        .from("admin_menu_items")
        .select("*")
        .eq("section_id", sectionId as string)
        .order("position");
      if (error) throw toAppError(error);
      return data;
    },
  });
}

export interface SaveMenuItemInput {
  id: string | null;
  sectionId: string;
  name: string;
  description: string | null;
  priceCents: number | null;
  dietary: string[];
  available: boolean;
  position: number;
}

export function useSaveMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveMenuItemInput) => {
      const { error } = await api().rpc(
        "save_menu_item",
        asArgs<Database["api"]["Functions"]["save_menu_item"]["Args"]>({
          p_id: input.id,
          p_section_id: input.sectionId,
          p_name: input.name,
          p_description: input.description,
          p_price_cents: input.priceCents,
          p_dietary: input.dietary,
          p_available: input.available,
          p_position: input.position,
        }),
      );
      if (error) throw toAppError(error);
    },
    onSuccess: (_void, input) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-menu-items", input.sectionId] });
      void queryClient.invalidateQueries({ queryKey: ["public-menu"] });
    },
  });
}
