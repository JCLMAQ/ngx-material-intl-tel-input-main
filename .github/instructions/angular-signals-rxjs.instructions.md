---
description:  Angular signals and RxJS - When to use which one
applyTo: "**/*.ts"
---


## Rules of thumb for using Angular Signals and not RxJS

- Convert observables to signals once.
- Make signals the canonical state for UI reads.
- Keep RxJS for stream transformations and side effects.
- Avoid bridging signals back to observables unless absolutely necessary.


## Migration checklist practical and small

- Identify places that mirror Subjects into signals.
- Replace the Subject->signal bridge with a single signal.
- If observable conversion is required, use toSignal or a single subscribe at a boundary.
- Convert pure presentation components to read signals directly.
- Run a local performance test: update loop and change detection counter.
- Ensure no unnecessary observable subscriptions remain.


## When RxJS is still the right tool Signals will not replace RxJS for:

- Complex stream transformations
- Operators like debounceTime, switchMap, concatMap.
- Complex pipeline error handling and cancellation logic.


## Hybrid architecture pattern (if necessary)
Use RxJS for streaming and orchestration. Use signals for local state and view-friendly derived state. When signals and RxJS must interact, convert at the boundary with toSignal or a single bridging point.

## Diagram: Hybrid Signal-RxJS Architecture
        +----------------+            +————————+

         |  Server Stream  |  --->    |   RxJS Logic    |

         +--------+------+            +————+———+

                  |                            |

                  | convert at edge            | convert at edge

                  v                            v

           +------+-----+                +-----+------+

           |  signal(s) |   <---- direct  |  signal   |

           |  (source)  |                |  wrapper  |

           +------+-----+                +-----+-----+

                  |                            |

             template reads                 many subscribers

                  |                            |

         +--------v--------+           +-------v--------+

         |  Component A    |           |  Component B   |

         +-----------------+           +----------------+



