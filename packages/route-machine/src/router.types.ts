import type { Machine, Service } from "@zag-js/core"
import type { CommonProperties, DirectionProperty, PropTypes, RequiredBy } from "@zag-js/types"

/* -----------------------------------------------------------------------------
 * Route types
 * -----------------------------------------------------------------------------*/

export interface RouteParams {
    [key: string]: string | undefined
}

export interface QueryParams {
    [key: string]: string | string[] | undefined
}

export interface RouteLocation {
    pathname: string
    search: string
    hash: string
    params: RouteParams
    query: QueryParams
    meta?: Record<string, any> | undefined
    name?: string | undefined
}

export interface RouteDefinition {
    path: string
    name?: string
    meta?: Record<string, any>
}

/* -----------------------------------------------------------------------------
 * Callback details
 * -----------------------------------------------------------------------------*/

export interface NavigationDetails {
    from: RouteLocation | null
    to: RouteLocation
    type: "push" | "replace" | "back" | "forward" | "initial"
    source?: "programmatic" | "browser" | "user"
}

export type NavigationGuardDetails = NavigationDetails

/* -----------------------------------------------------------------------------
 * Machine context
 * -----------------------------------------------------------------------------*/

export type ElementIds = Partial<{
    root: string
    outlet: string
}>

export interface RouterProps extends DirectionProperty, CommonProperties {
    /**
     * The ids of the elements in the router. Useful for composition.
     */
    ids?: ElementIds | undefined
    /**
     * The base path for all routes
     * @default "/"
     */
    basePath?: string | undefined
    /**
     * Whether to use hash routing instead of history API
     * @default false
     */
    hashRouting?: boolean | undefined
    /**
     * The initial route location
     */
    initialLocation?: Partial<RouteLocation> | undefined
    /**
     * Route definitions for validation and metadata
     */
    routes?: RouteDefinition[] | undefined
    /**
     * Whether to scroll to top on route change
     * @default true
     */
    scrollToTop?: boolean | undefined
    /**
     * The scroll restoration behavior
     * @default "auto"
     */
    scrollRestoration?: ScrollRestoration | undefined
    /**
     * Function called before navigation.
     * Return false to prevent navigation
     * Return string to redirect to a different route
     * Return true/undefined to allow navigation
     */
    onBeforeNavigate?: ((details: NavigationGuardDetails) => void | boolean | string) | undefined
    /**
     * Function called after navigation
     */
    onNavigate?: ((details: NavigationDetails) => void) | undefined
    /**
     * Function called when navigation starts (for loading states)
     */
    onNavigationStart?: ((details: NavigationDetails) => void) | undefined
    /**
     * Function called when navigation ends (for loading states)
     */
    onNavigationEnd?: ((details: NavigationDetails) => void) | undefined
    /**
     * Function called when navigation fails
     */
    onNavigationError?: ((error: Error, details: NavigationDetails) => void) | undefined
}

type PropsWithDefault =
    | "basePath"
    | "hashRouting"
    | "scrollToTop"
    | "scrollRestoration"

interface PrivateContext {
    /**
     * The current route location
     */
    location: RouteLocation
    /**
     * The previous route location
     */
    previousLocation: RouteLocation | null
    /**
     * Whether navigation is in progress
     */
    navigating: boolean
    /**
     * The pending navigation details
     */
    pendingNavigation: NavigationDetails | null
    /**
     * Whether the router has been initialized
     */
    initialized: boolean
    /**
     * Navigation history stack for back/forward
     */
    historyStack: RouteLocation[]
    /**
     * Current position in history stack
     */
    historyIndex: number
}

type ComputedContext = Readonly<{
    /**
     * Whether we can go back in history
     */
    canGoBack: boolean
    /**
     * Whether we can go forward in history
     */
    canGoForward: boolean
    /**
     * The current route name (if defined in routes)
     */
    currentRouteName: string | undefined
    /**
     * The current route metadata
     */
    currentRouteMeta: Record<string, any> | undefined
}>

export interface RouterSchema {
    props: RequiredBy<RouterProps, PropsWithDefault>
    context: PrivateContext
    computed: ComputedContext
    state: "initializing" | "idle" | "navigating" | "error"
    event: {
        type:
        | "NAVIGATE"
        | "BACK"
        | "FORWARD"
        | "REPLACE"
        | "PUSH"
        | "POP_STATE"
        | "HASH_CHANGE"
        | "NAVIGATION_COMPLETE"
        | "NAVIGATION_ERROR"
        | "INITIALIZE"
        pathname?: string
        search?: string
        hash?: string
        url?: string
        state?: any
        error?: Error
    }
    guard:
    | "isHashRouting"
    | "isHistoryRouting"
    | "canNavigate"
    | "canGoBack"
    | "canGoForward"
    effect:
    | "trackPopState"
    | "trackHashChange"
    | "scrollToTop"
    | "scrollToTopEffect"
    | "restoreScroll"
    action:
    | "initializeLocation"
    | "initializeWithGuards"
    | "updateLocation"
    | "setNavigating"
    | "clearNavigating"
    | "updateHistory"
    | "updateBrowserHistory"
    | "invokeNavigationStart"
    | "invokeNavigationEnd"
    | "invokeNavigationError"
    | "invokeBeforeNavigate"
    | "invokeBeforeNavigateForInitial"
    | "invokeOnNavigate"
    | "handlePopState"
    | "handleHashChange"
    | "goBack"
    | "goForward"
    | "preventNavigation"
    | "scrollToTopAction"
    | "scrollToTopEffect"
    | "restoreScrollAction"
}

export type RouterService = Service<RouterSchema>

export type RouterMachine = Machine<RouterSchema>

/* -----------------------------------------------------------------------------
 * Component props
 * -----------------------------------------------------------------------------*/

export interface LinkProps {
    to: string
    replace?: boolean
    state?: any
    target?: string
    rel?: string
    preventDefault?: boolean
}

export interface RouterApi<T extends PropTypes = PropTypes> {
    /**
     * The current location
     */
    location: RouteLocation
    /**
     * The previous location
     */
    previousLocation: RouteLocation | null
    /**
     * Whether navigation is in progress
     */
    navigating: boolean
    /**
     * Whether we can go back
     */
    canGoBack: boolean
    /**
     * Whether we can go forward
     */
    canGoForward: boolean
    /**
     * The current route name
     */
    currentRouteName: string | undefined
    /**
     * The current route metadata
     */
    currentRouteMeta: Record<string, any> | undefined

    /**
     * Navigate to a new location
     */
    navigate: (to: string | Partial<RouteLocation>, options?: { replace?: boolean; state?: any }) => void
    /**
     * Push a new location to history
     */
    push: (to: string | Partial<RouteLocation>, state?: any) => void
    /**
     * Replace current location in history
     */
    replace: (to: string | Partial<RouteLocation>, state?: any) => void
    /**
     * Go back in history
     */
    back: () => void
    /**
     * Go forward in history
     */
    forward: () => void
    /**
     * Go to a specific position in history
     */
    go: (delta: number) => void
    /**
     * Create a URL for the given route
     */
    createUrl: (to: string | Partial<RouteLocation>) => string
    /**
     * Check if a route is currently active
     */
    isActive: (to: string | Partial<RouteLocation>, exact?: boolean) => boolean
    /**
     * Parse a URL into a RouteLocation
     */
    parseUrl: (url: string) => RouteLocation

    getRootProps: () => T["element"]
    getOutletProps: () => T["element"]
    getLinkProps: (props: LinkProps) => T["element"]
}
