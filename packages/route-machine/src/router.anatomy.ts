import { createAnatomy } from "@zag-js/anatomy"

export const anatomy = createAnatomy("router").parts(
    "root",
    "outlet",
    "link",
)

export const parts = anatomy.build()
