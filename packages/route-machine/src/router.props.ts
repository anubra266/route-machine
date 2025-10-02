import { createProps } from "@zag-js/types"
import { createSplitProps } from "@zag-js/utils"
import type { RouterProps } from "./router.types"

export const props = createProps<RouterProps>()([
  "basePath",
  "dir",
  "getRootNode",
  "hashRouting",
  "id",
  "ids",
  "initialLocation",
  "onBeforeNavigate",
  "onNavigate",
  "onNavigationEnd",
  "onNavigationError",
  "onNavigationStart",
  "routes",
  "scrollRestoration",
  "scrollToTop",
])

export const splitProps = createSplitProps<Partial<RouterProps>>(props)
