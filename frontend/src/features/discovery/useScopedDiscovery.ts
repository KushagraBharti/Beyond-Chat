import { useMemo } from "react";
import type { DiscoveryItem } from "@beyond/product-catalog";
import { useAuth } from "../../context/AuthContext";
import { getOrganizationCatalog } from "../workspace/api";
import { useSection } from "../workspace/hooks";
import { useProjects } from "../workspace/ProjectContext";
import { scopedDiscoveryItems } from "./scopedDiscovery";

/** Live palette items for the current organization: built-ins plus real
 * projects and real catalog records. Degrades to built-ins alone while data
 * loads or fails — never to fixtures. */
export function useScopedDiscovery(): readonly DiscoveryItem[] {
  const { session } = useAuth();
  const { projects } = useProjects();
  const catalog = useSection(getOrganizationCatalog, session?.organizationId ?? "anonymous");
  return useMemo(
    () => scopedDiscoveryItems(projects, catalog.status === "ready" || catalog.status === "empty" ? catalog.data : null),
    [projects, catalog.status, catalog.data],
  );
}
