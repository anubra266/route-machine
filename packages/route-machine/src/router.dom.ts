import type { Scope } from "@zag-js/core"

export const getRootId = (ctx: Scope) => ctx.ids?.root ?? `router:${ctx.id}`
export const getOutletId = (ctx: Scope) => ctx.ids?.outlet ?? `router:${ctx.id}:outlet`

export const getRootEl = (ctx: Scope) => ctx.getById(getRootId(ctx))
export const getOutletEl = (ctx: Scope) => ctx.getById(getOutletId(ctx))

// Parse URL into location parts
export const parseUrl = (url: string, basePath: string = "/") => {
    // Handle absolute vs relative URLs correctly
    let urlObj: URL

    if (typeof window === "undefined") {
        // Server-side: treat all paths as absolute from root
        urlObj = new URL(url, "http://localhost")
    } else if (url.startsWith('/') || url.includes('://')) {
        // Client-side: absolute path or full URL
        urlObj = new URL(url, window.location.origin)
    } else {
        // Client-side: relative path
        urlObj = new URL(url, window.location.href)
    }

    let pathname = urlObj.pathname

    // Handle base path
    if (basePath !== "/" && pathname.startsWith(basePath)) {
        pathname = pathname.slice(basePath.length) || "/"
    }

    // Parse query parameters
    const query: Record<string, string | string[]> = {}
    for (const [key, value] of urlObj.searchParams.entries()) {
        if (query[key]) {
            // Convert to array if multiple values
            if (Array.isArray(query[key])) {
                ; (query[key] as string[]).push(value)
            } else {
                query[key] = [query[key] as string, value]
            }
        } else {
            query[key] = value
        }
    }

    return {
        pathname,
        search: urlObj.search,
        hash: urlObj.hash,
        query,
        params: {} as Record<string, string | undefined>, // Will be populated by route matching
    }
}

// Create URL with base path
export const createUrl = (pathname: string, search: string = "", hash: string = "", basePath: string = "/") => {
    let fullPath = pathname

    // Add base path if not root and basePath is not empty
    if (basePath && basePath !== "/") {
        fullPath = basePath + (pathname.startsWith("/") ? pathname.slice(1) : pathname)
    }

    return fullPath + search + hash
}

// Extract route parameters from pathname using a pattern
export const extractParams = (pathname: string, pattern: string): Record<string, string> => {
    const params: Record<string, string> = {}

    // Handle catch-all routes - they don't have parameters
    if (pattern === "*" || pattern === "/*" || pattern.endsWith("/*")) {
        return params
    }

    // Convert pattern to regex, capturing named parameters
    const regexPattern = pattern.replace(/:(\w+)/g, (_, paramName) => {
        return `(?<${paramName}>[^/]+)`
    })

    const match = pathname.match(new RegExp(`^${regexPattern}$`))
    if (match?.groups) {
        Object.assign(params, match.groups)
    }

    return params
}

// Check if a pathname matches a pattern
export const matchesPattern = (pathname: string, pattern: string): boolean => {
    // Exact match
    if (pathname === pattern) return true

    // Global catch-all
    if (pattern === "*" || pattern === "/*") return true

    // Prefix catch-all like "/admin/*"
    if (pattern.endsWith("/*")) {
        const prefix = pattern.slice(0, -2)
        return pathname.startsWith(prefix + "/") || pathname === prefix
    }

    // Parameter-based patterns like "/users/:id"
    const regexPattern = pattern.replace(/:(\w+)/g, "([^/]+)")
    return new RegExp(`^${regexPattern}$`).test(pathname)
}

// Find the best matching route (most specific first)
export const findBestMatchingRoute = (pathname: string, routes: any[]) => {
    // Sort routes by specificity (more specific patterns first)
    const sortedRoutes = [...routes].sort((a, b) => {
        // Static routes (no params or wildcards) come first
        const aStatic = !a.path.includes(":") && !a.path.includes("*")
        const bStatic = !b.path.includes(":") && !b.path.includes("*")
        if (aStatic && !bStatic) return -1
        if (!aStatic && bStatic) return 1

        // Among dynamic routes, longer paths come first
        const aSegments = a.path.split("/").length
        const bSegments = b.path.split("/").length
        if (aSegments !== bSegments) return bSegments - aSegments

        // Catch-all routes come last
        if (a.path.includes("*") && !b.path.includes("*")) return 1
        if (!a.path.includes("*") && b.path.includes("*")) return -1

        return 0
    })

    // Find first match
    return sortedRoutes.find(route => matchesPattern(pathname, route.path))
}
