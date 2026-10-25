import type { Accessor, Setter } from "solid-js"

let active: Accessor<boolean> = () => false
let setActive: Setter<boolean> = () => false

export function provideState(a: Accessor<boolean>, s: Setter<boolean>) {
  active = a
  setActive = s
}

export { active, setActive }
