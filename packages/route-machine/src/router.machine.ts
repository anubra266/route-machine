import { createMachine } from "@zag-js/core"
import { compact } from "@zag-js/utils"
import * as dom from "./router.dom"
import type {
    RouterSchema,
    RouteLocation,
    NavigationDetails,
    RouteDefinition,
} from "./router.types"

export const machine = createMachine<RouterSchema>({
    props({ props }) {
        return compact({
            basePath: "/",
            hashRouting: false,
            scrollToTop: true,
            scrollRestoration: "auto",
            ...props,
        })
    },

    initialState() {
        return "initializing"
    },

    context({ prop, bindable }) {
        const initialLocation = getInitialLocation(prop("initialLocation"), prop("basePath"), prop("hashRouting"))

        return {
            location: bindable<RouteLocation>(() => ({
                defaultValue: initialLocation,
            })),
            previousLocation: bindable<RouteLocation | null>(() => ({
                defaultValue: null,
            })),
            navigating: bindable<boolean>(() => ({
                defaultValue: false,
            })),
            pendingNavigation: bindable<NavigationDetails | null>(() => ({
                defaultValue: null,
            })),
            initialized: bindable<boolean>(() => ({
                defaultValue: false,
            })),
            historyStack: bindable<RouteLocation[]>(() => ({
                defaultValue: [initialLocation],
            })),
            historyIndex: bindable<number>(() => ({
                defaultValue: 0,
            })),
        }
    },

    computed: {
        canGoBack: ({ context }) => context.get("historyIndex") > 0,
        canGoForward: ({ context }) => context.get("historyIndex") < context.get("historyStack").length - 1,
        currentRouteName: ({ context, prop }) => {
            const routes = prop("routes")
            if (!routes) return undefined
            const location = context.get("location")
            return findRouteByLocation(location, routes)?.name
        },
        currentRouteMeta: ({ context, prop }) => {
            const routes = prop("routes")
            if (!routes) return undefined
            const location = context.get("location")
            return findRouteByLocation(location, routes)?.meta
        },
    },

    watch({ send }) {
        // Track browser back/forward navigation
        if (typeof window !== "undefined") {
            const handlePopState = (event: PopStateEvent) => {
                send({ type: "POP_STATE", state: event.state })
            }

            const handleHashChange = () => {
                send({ type: "HASH_CHANGE" })
            }

            window.addEventListener("popstate", handlePopState)
            window.addEventListener("hashchange", handleHashChange)

            return () => {
                window.removeEventListener("popstate", handlePopState)
                window.removeEventListener("hashchange", handleHashChange)
            }
        }
    },

    entry: ["initializeWithGuards"],

    states: {
        initializing: {
            entry: ["invokeBeforeNavigateForInitial"],
            on: {
                NAVIGATION_COMPLETE: {
                    target: "idle",
                    actions: ["updateLocation", "updateHistory", "invokeNavigationEnd", "invokeOnNavigate", "clearNavigating"],
                },
                NAVIGATION_ERROR: {
                    target: "error",
                    actions: ["clearNavigating", "invokeNavigationError"],
                },
            },
        },

        idle: {
            on: {
                NAVIGATE: {
                    target: "navigating",
                    actions: ["setNavigating", "invokeNavigationStart"],
                },
                PUSH: {
                    target: "navigating",
                    actions: ["setNavigating", "invokeNavigationStart"],
                },
                REPLACE: {
                    target: "navigating",
                    actions: ["setNavigating", "invokeNavigationStart"],
                },
                BACK: [
                    {
                        guard: "canGoBack",
                        target: "navigating",
                        actions: ["setNavigating", "invokeNavigationStart", "goBack"],
                    },
                ],
                FORWARD: [
                    {
                        guard: "canGoForward",
                        target: "navigating",
                        actions: ["setNavigating", "invokeNavigationStart", "goForward"],
                    },
                ],
                POP_STATE: {
                    target: "navigating",
                    actions: ["setNavigating", "invokeNavigationStart", "handlePopState"],
                },
                HASH_CHANGE: [
                    {
                        guard: "isHashRouting",
                        target: "navigating",
                        actions: ["setNavigating", "invokeNavigationStart", "handleHashChange"],
                    },
                ],
            },
        },

        navigating: {
            entry: ["invokeBeforeNavigate"],
            on: {
                NAVIGATION_COMPLETE: {
                    target: "idle",
                    actions: ["updateLocation", "updateHistory", "updateBrowserHistory", "scrollToTopEffect", "invokeNavigationEnd", "invokeOnNavigate", "clearNavigating"],
                },
                NAVIGATION_ERROR: {
                    target: "error",
                    actions: ["clearNavigating", "invokeNavigationError"],
                },
                NAVIGATE: {
                    actions: ["setNavigating", "invokeNavigationStart"], // Allow new navigation to override
                },
            },
        },

        error: {
            on: {
                NAVIGATE: {
                    target: "navigating",
                    actions: ["setNavigating", "invokeNavigationStart"],
                },
                PUSH: {
                    target: "navigating",
                    actions: ["setNavigating", "invokeNavigationStart"],
                },
                REPLACE: {
                    target: "navigating",
                    actions: ["setNavigating", "invokeNavigationStart"],
                },
                BACK: [
                    {
                        guard: "canGoBack",
                        target: "navigating",
                        actions: ["setNavigating", "invokeNavigationStart", "goBack"],
                    },
                ],
                FORWARD: [
                    {
                        guard: "canGoForward",
                        target: "navigating",
                        actions: ["setNavigating", "invokeNavigationStart", "goForward"],
                    },
                ],
            },
        },
    },

    implementations: {
        guards: {
            isHashRouting: ({ prop }) => prop("hashRouting"),
            isHistoryRouting: ({ prop }) => !prop("hashRouting"),
            canGoBack: ({ context }: any) => context.get("historyIndex") > 0,
            canGoForward: ({ context }: any) => context.get("historyIndex") < context.get("historyStack").length - 1,
            canNavigate: ({ context }) => context.get("initialized"),
        },

        effects: {

            scrollToTop: ({ prop }) => {
                if (prop("scrollToTop") && typeof window !== "undefined") {
                    window.scrollTo(0, 0)
                }
            },

            scrollToTopEffect: ({ prop }: any) => {
                if (prop("scrollToTop") && typeof window !== "undefined") {
                    window.scrollTo(0, 0)
                }
            },

            trackPopState: () => {
                // Pop state tracking is handled in the watch function
            },

            trackHashChange: () => {
                // Hash change tracking is handled in the watch function
            },


            restoreScroll: () => {
                // Scroll restoration would be implemented here
            },
        },

        actions: {
            initializeLocation({ context, prop, send }) {
                const currentUrl = typeof window !== "undefined"
                    ? window.location.href
                    : "/"

                const location = dom.parseUrl(currentUrl, prop("basePath"))

                // Extract route parameters and enrich with metadata if routes are defined
                const routes = prop("routes")
                if (routes) {
                    const matchedRoute = findRouteByLocation(location, routes)
                    if (matchedRoute) {
                        location.params = dom.extractParams(location.pathname, matchedRoute.path)
                    }
                }

                // Enrich location with metadata before setting
                const enrichedLocation = enrichLocationWithMeta(location, routes)
                context.set("location", enrichedLocation)
                context.set("initialized", true)

                // Complete initialization
                setTimeout(() => {
                    send({ type: "NAVIGATION_COMPLETE" })
                }, 0)
            },

            initializeWithGuards({ context, prop }) {
                const currentUrl = typeof window !== "undefined"
                    ? window.location.href
                    : "/"

                const location = dom.parseUrl(currentUrl, prop("basePath"))

                // Extract route parameters if routes are defined
                const routes = prop("routes")
                if (routes) {
                    const matchedRoute = findRouteByLocation(location, routes)
                    if (matchedRoute) {
                        location.params = dom.extractParams(location.pathname, matchedRoute.path)
                    }
                }

                // Create navigation details for initial load (goes through guard flow)
                const navigationDetails = createNavigationDetailsWithMeta(
                    null, // no "from" location
                    location,
                    "initial",
                    "browser",
                    routes
                )

                context.set("pendingNavigation", navigationDetails)
                context.set("initialized", true)

                // Don't send event here - let the state entry handle it
            },

            setNavigating({ context, event, prop }) {
                context.set("navigating", true)

                // Create navigation details
                const to = createNavigationTarget(event, context.get("location"), prop)
                const from = context.get("location")
                const type = getNavigationType(event)

                const navigationDetails = createNavigationDetailsWithMeta(
                    from,
                    to,
                    type,
                    "programmatic",
                    prop("routes")
                )

                context.set("pendingNavigation", navigationDetails)
            },

            clearNavigating({ context }) {
                context.set("navigating", false)
                context.set("pendingNavigation", null)
            },

            updateLocation({ context, prop }) {
                const pendingNav = context.get("pendingNavigation")
                if (!pendingNav) return

                // Update previous location (enrich with metadata)
                const currentLocation = context.get("location")
                const enrichedCurrentLocation = enrichLocationWithMeta(currentLocation, prop("routes"))
                context.set("previousLocation", enrichedCurrentLocation)

                // Extract route parameters and enrich with metadata
                let newLocation = pendingNav.to
                const routes = prop("routes")
                if (routes) {
                    const matchedRoute = findRouteByLocation(newLocation, routes)
                    if (matchedRoute) {
                        newLocation.params = dom.extractParams(newLocation.pathname, matchedRoute.path)
                    }
                }

                // Enrich new location with metadata before setting
                const enrichedNewLocation = enrichLocationWithMeta(newLocation, routes)
                context.set("location", enrichedNewLocation)
            },

            updateHistory({ context }) {
                const pendingNav = context.get("pendingNavigation")
                if (!pendingNav) return

                const { type, to } = pendingNav
                const stack = context.get("historyStack")
                const index = context.get("historyIndex")

                switch (type) {
                    case "push":
                        // Remove any forward history and add new entry
                        const newStack = stack.slice(0, index + 1)
                        newStack.push(to)
                        context.set("historyStack", newStack)
                        context.set("historyIndex", newStack.length - 1)
                        break

                    case "replace":
                        // Replace current entry
                        const replacedStack = [...stack]
                        replacedStack[index] = to
                        context.set("historyStack", replacedStack)
                        break

                    case "back":
                        // historyIndex already updated in goBack action
                        break

                    case "forward":
                        // historyIndex already updated in goForward action
                        break
                }
            },

            goBack({ context, prop }: any) {
                const index = context.get("historyIndex")
                if (index > 0) {
                    context.set("historyIndex", index - 1)
                    const location = context.get("historyStack")[index - 1]

                    const navigationDetails = createNavigationDetailsWithMeta(
                        context.get("location"),
                        location,
                        "back",
                        "programmatic",
                        prop("routes")
                    )
                    context.set("pendingNavigation", navigationDetails)
                }
            },

            goForward({ context, prop }: any) {
                const index = context.get("historyIndex")
                const stack = context.get("historyStack")
                if (index < stack.length - 1) {
                    context.set("historyIndex", index + 1)
                    const location = stack[index + 1]

                    const navigationDetails = createNavigationDetailsWithMeta(
                        context.get("location"),
                        location,
                        "forward",
                        "programmatic",
                        prop("routes")
                    )
                    context.set("pendingNavigation", navigationDetails)
                }
            },

            handlePopState({ context, prop, send }: any) {
                const currentUrl = typeof window !== "undefined" ? window.location.href : "/"
                const location = dom.parseUrl(currentUrl, prop("basePath"))

                const navigationDetails = createNavigationDetailsWithMeta(
                    context.get("location"),
                    location,
                    "back", // Could be back or forward, but we'll call it back for simplicity
                    "browser",
                    prop("routes")
                )
                context.set("pendingNavigation", navigationDetails)

                setTimeout(() => {
                    send({ type: "NAVIGATION_COMPLETE" })
                }, 0)
            },

            handleHashChange({ context, prop, send }: any) {
                if (!prop("hashRouting")) return

                const hash = typeof window !== "undefined" ? window.location.hash : ""
                const pathname = hash.slice(1) || "/"
                const location = { ...context.get("location"), pathname }

                const navigationDetails = createNavigationDetailsWithMeta(
                    context.get("location"),
                    location,
                    "push",
                    "browser",
                    prop("routes")
                )
                context.set("pendingNavigation", navigationDetails)

                setTimeout(() => {
                    send({ type: "NAVIGATION_COMPLETE" })
                }, 0)
            },


            invokeNavigationStart({ prop, context }) {
                const onNavigationStart = prop("onNavigationStart")
                const pendingNav = context.get("pendingNavigation")
                if (onNavigationStart && pendingNav) {
                    onNavigationStart(pendingNav)
                }
            },

            invokeNavigationEnd({ prop, context }) {
                const onNavigationEnd = prop("onNavigationEnd")
                const pendingNav = context.get("pendingNavigation")
                if (onNavigationEnd && pendingNav) {
                    onNavigationEnd(pendingNav)
                }
            },

            invokeNavigationError({ prop, event }) {
                const onNavigationError = prop("onNavigationError")
                if (onNavigationError && event.error) {
                    // We need the navigation details here, but they might not be available in error state
                    const navigationDetails: NavigationDetails = {
                        from: null,
                        to: { pathname: "", search: "", hash: "", params: {}, query: {} },
                        type: "push",
                        source: "programmatic",
                    }
                    onNavigationError(event.error, navigationDetails)
                }
            },

            invokeBeforeNavigate({ prop, context, send }) {
                const onBeforeNavigate = prop("onBeforeNavigate")
                const pendingNav = context.get("pendingNavigation")

                if (onBeforeNavigate && pendingNav) {
                    const result = onBeforeNavigate(pendingNav)

                    if (result === false) {
                        // Return false to prevent navigation
                        send({ type: "NAVIGATION_ERROR", error: new Error("Navigation prevented") })
                    } else if (typeof result === "string") {
                        // Return string to redirect to different route
                        const redirectLocation = dom.parseUrl(result, prop("basePath"))
                        const enrichedLocation = enrichLocationWithMeta(redirectLocation, prop("routes"))

                        const redirectDetails = createNavigationDetailsWithMeta(
                            context.get("location"),
                            enrichedLocation,
                            "replace",
                            "programmatic",
                            prop("routes")
                        )

                        context.set("pendingNavigation", redirectDetails)
                        send({ type: "NAVIGATION_COMPLETE" })
                    } else {
                        // Return true, undefined, or void - allow navigation
                        send({ type: "NAVIGATION_COMPLETE" })
                    }
                } else {
                    send({ type: "NAVIGATION_COMPLETE" })
                }
            },

            invokeOnNavigate({ prop, context }) {
                const onNavigate = prop("onNavigate")
                const pendingNav = context.get("pendingNavigation")
                if (onNavigate && pendingNav) {
                    onNavigate(pendingNav)
                }
            },

            preventNavigation() {
                // Prevent navigation - already handled in beforeNavigate
            },

            scrollToTopAction({ prop }: any) {
                if (prop("scrollToTop") && typeof window !== "undefined") {
                    window.scrollTo(0, 0)
                }
            },

            restoreScrollAction() {
                // Restore scroll position
            },

            invokeBeforeNavigateForInitial({ prop, context, send }) {
                // Use a slight delay to ensure state transition is complete
                setTimeout(() => {
                    const onBeforeNavigate = prop("onBeforeNavigate")
                    const pendingNav = context.get("pendingNavigation")


                    if (onBeforeNavigate && pendingNav) {
                        const result = onBeforeNavigate(pendingNav)

                        if (result === false) {
                            // Return false to prevent navigation - for initial load, redirect to fallback
                            const fallbackLocation = dom.parseUrl("/", prop("basePath"))
                            const enrichedFallback = enrichLocationWithMeta(fallbackLocation, prop("routes"))

                            const fallbackDetails = createNavigationDetailsWithMeta(
                                null,
                                enrichedFallback,
                                "replace",
                                "programmatic",
                                prop("routes")
                            )

                            context.set("pendingNavigation", fallbackDetails)
                            send({ type: "NAVIGATION_COMPLETE" })
                        } else if (typeof result === "string") {
                            // Return string to redirect to different route
                            const redirectLocation = dom.parseUrl(result, prop("basePath"))
                            const enrichedLocation = enrichLocationWithMeta(redirectLocation, prop("routes"))

                            const redirectDetails = createNavigationDetailsWithMeta(
                                null,
                                enrichedLocation,
                                "replace",
                                "programmatic",
                                prop("routes")
                            )

                            context.set("pendingNavigation", redirectDetails)
                            send({ type: "NAVIGATION_COMPLETE" })
                        } else {
                            // Allow navigation
                            send({ type: "NAVIGATION_COMPLETE" })
                        }
                    } else {
                        // No guard function, allow navigation
                        send({ type: "NAVIGATION_COMPLETE" })
                    }
                }, 0)
            },

            updateBrowserHistory({ context, prop }) {
                if (typeof window === "undefined") return

                const pendingNav = context.get("pendingNavigation")
                const location = pendingNav?.to || context.get("location")
                const url = dom.createUrl(location.pathname, location.search, location.hash, prop("basePath"))

                if (prop("hashRouting")) {
                    window.location.hash = location.pathname + location.search
                } else {
                    // Only skip URL updates for browser-initiated back/forward navigation (popstate events)
                    // Allow URL updates for programmatic back/forward navigation
                    const shouldSkipUpdate = pendingNav?.source === "browser" &&
                        (pendingNav?.type === "back" || pendingNav?.type === "forward")

                    if (!shouldSkipUpdate) {
                        const method = pendingNav?.type === "replace" ? "replaceState" :
                            (pendingNav?.type === "back" || pendingNav?.type === "forward") ? "replaceState" :
                                "pushState"
                        window.history[method](null, "", url)
                    }
                }
            },

            scrollToTopEffect({ prop }: any) {
                if (prop("scrollToTop") && typeof window !== "undefined") {
                    window.scrollTo(0, 0)
                }
            },
        },
    },
})

// Helper functions

function getInitialLocation(
    initialLocation: Partial<RouteLocation> | undefined,
    basePath: string,
    _hashRouting: boolean
): RouteLocation {
    if (initialLocation) {
        return {
            pathname: "/",
            search: "",
            hash: "",
            params: {},
            query: {},
            ...initialLocation,
        }
    }

    if (typeof window === "undefined") {
        return {
            pathname: "/",
            search: "",
            hash: "",
            params: {},
            query: {},
        }
    }

    return dom.parseUrl(window.location.href, basePath)
}

function createNavigationTarget(
    event: any,
    currentLocation: RouteLocation,
    prop: any
): RouteLocation {
    if (event.pathname !== undefined) {
        return {
            pathname: event.pathname || "/",
            search: event.search || "",
            hash: event.hash || "",
            params: {},
            query: event.search ? Object.fromEntries(new URLSearchParams(event.search)) : {},
        }
    }

    if (event.url) {
        return dom.parseUrl(event.url, prop("basePath"))
    }

    return currentLocation
}

function getNavigationType(event: any): NavigationDetails["type"] {
    switch (event.type) {
        case "PUSH":
            return "push"
        case "REPLACE":
            return "replace"
        case "BACK":
            return "back"
        case "FORWARD":
            return "forward"
        case "POP_STATE":
            return "back" // Could be forward too, but we simplify
        case "HASH_CHANGE":
            return "push"
        case "INITIALIZE":
            return "initial"
        default:
            return "push"
    }
}

function findRouteByLocation(location: RouteLocation, routes: RouteDefinition[]) {
    return dom.findBestMatchingRoute(location.pathname, routes)
}

function enrichLocationWithMeta(location: RouteLocation, routes?: RouteDefinition[]): RouteLocation {
    if (!routes) return location

    const matchedRoute = findRouteByLocation(location, routes)
    if (!matchedRoute) return location

    return {
        ...location,
        meta: matchedRoute.meta,
        name: matchedRoute.name,
    }
}

function createNavigationDetailsWithMeta(
    from: RouteLocation | null,
    to: RouteLocation,
    type: NavigationDetails["type"],
    source: "programmatic" | "browser" | "user",
    routes?: RouteDefinition[]
): NavigationDetails {
    return {
        from: from ? enrichLocationWithMeta(from, routes) : null,
        to: enrichLocationWithMeta(to, routes),
        type,
        source,
    }
}