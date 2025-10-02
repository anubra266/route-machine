import { dataAttr } from "@zag-js/dom-query"
import type { NormalizeProps, PropTypes } from "@zag-js/types"
import { parts } from "./router.anatomy"
import * as dom from "./router.dom"
import type {
    LinkProps,
    RouteLocation,
    RouterApi,
    RouterService,
} from "./router.types"

export function connect<T extends PropTypes>(
    service: RouterService,
    normalize: NormalizeProps<T>
): RouterApi<T> {
    const { context, send, computed, prop } = service

    const location = context.get("location")
    const navigating = context.get("navigating")
    const previousLocation = context.get("previousLocation")

    const navigate = (
        to: string | Partial<RouteLocation>,
        options: { replace?: boolean; state?: any } = {}
    ) => {
        const target = typeof to === "string" ? dom.parseUrl(to, prop("basePath")) : to
        const eventType = options.replace ? "REPLACE" : "NAVIGATE"

        send({
            type: eventType as "REPLACE" | "NAVIGATE",
            pathname: target.pathname || "/",
            search: target.search || "",
            hash: target.hash || "",
            state: options.state,
        })
    }

    const push = (to: string | Partial<RouteLocation>, state?: any) => {
        navigate(to, { replace: false, state })
    }

    const replace = (to: string | Partial<RouteLocation>, state?: any) => {
        navigate(to, { replace: true, state })
    }

    const back = () => {
        send({ type: "BACK" })
    }

    const forward = () => {
        send({ type: "FORWARD" })
    }

    const go = (delta: number) => {
        if (delta < 0) {
            // Go back multiple steps - for simplicity, just go back once
            for (let i = 0; i < Math.abs(delta); i++) {
                back()
            }
        } else if (delta > 0) {
            // Go forward multiple steps - for simplicity, just go forward once  
            for (let i = 0; i < delta; i++) {
                forward()
            }
        }
    }

    const createUrl = (to: string | Partial<RouteLocation>): string => {
        const target = typeof to === "string" ? dom.parseUrl(to, prop("basePath")) : to
        return dom.createUrl(
            target.pathname || "/",
            target.search || "",
            target.hash || "",
            prop("basePath")
        )
    }

    const isActive = (to: string | Partial<RouteLocation>, exact = false): boolean => {
        const target = typeof to === "string" ? dom.parseUrl(to, prop("basePath")) : to
        const currentPathname = location.pathname

        if (exact) {
            return currentPathname === (target.pathname || "/")
        }

        // Check if current path starts with target path
        const targetPathname = target.pathname || "/"
        return currentPathname.startsWith(targetPathname)
    }

    const parseUrl = (url: string): RouteLocation => {
        return dom.parseUrl(url, prop("basePath"))
    }

    return {
        // State
        location,
        previousLocation,
        navigating,
        canGoBack: computed("canGoBack"),
        canGoForward: computed("canGoForward"),
        currentRouteName: computed("currentRouteName"),
        currentRouteMeta: computed("currentRouteMeta"),

        // Methods
        navigate,
        push,
        replace,
        back,
        forward,
        go,
        createUrl,
        isActive,
        parseUrl,

        // Props
        getRootProps() {
            return normalize.element({
                ...parts.root.attrs,
                id: dom.getRootId(service.scope),
                dir: prop("dir"),
                "data-navigating": dataAttr(navigating),
            })
        },

        getOutletProps() {
            return normalize.element({
                ...parts.outlet.attrs,
                id: dom.getOutletId(service.scope),
                dir: prop("dir"),
                "data-navigating": dataAttr(navigating),
                "data-pathname": location.pathname,
            })
        },

        getLinkProps(props: LinkProps) {
            const { to, replace = false, state, target, rel, preventDefault = false } = props
            const href = createUrl(to)
            const active = isActive(to)

            return normalize.element({
                ...parts.link.attrs,
                href,
                target,
                rel,
                "data-active": dataAttr(active),
                "data-current": dataAttr(location.pathname === (typeof to === "string" ? dom.parseUrl(to, prop("basePath")).pathname : (to as RouteLocation).pathname)),
                onClick(event) {
                    if (preventDefault) {
                        event.preventDefault()
                        return
                    }

                    // Let external links work normally
                    if (target === "_blank") return
                    if (rel?.includes("external")) return
                    if (event.defaultPrevented) return
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

                    event.preventDefault()

                    if (replace) {
                        navigate(to, { replace: true, state })
                    } else {
                        navigate(to, { state })
                    }
                },
            })
        },
    }
}
