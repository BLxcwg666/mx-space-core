import { sleep } from '@mx-space/compiled'

export function scheduleMicrotask(callback: () => void) {
  sleep(0).then(callback)
}

// TYPES

type NotifyCallback = () => void

type NotifyFunction = (callback: () => void) => void

type BatchNotifyFunction = (callback: () => void) => void

export function createNotifyManager() {
  let queue: NotifyCallback[] = []
  let transactions = 0
  let notifyFn: NotifyFunction = (callback) => {
    callback()
  }
  let batchNotifyFn: BatchNotifyFunction = (callback: () => void) => {
    callback()
  }

  const batch = <T>(callback: () => T): T => {
    let result
    transactions++
    try {
      result = callback()
    } finally {
      transactions--
      if (!transactions) {
        flush()
      }
    }
    return result
  }

  const schedule = (callback: NotifyCallback): void => {
    if (transactions) {
      queue.push(callback)
    } else {
      scheduleMicrotask(() => {
        notifyFn(callback)
      })
    }
  }

  /**
   * All calls to the wrapped function will be batched.
   */
  const batchCalls = <T extends Function>(callback: T): T => {
    return ((...args: any[]) => {
      schedule(() => {
        callback(...args)
      })
    }) as any
  }

  const flush = (): void => {
    const originalQueue = queue
    queue = []
    if (originalQueue.length > 0) {
      scheduleMicrotask(() => {
        batchNotifyFn(() => {
          originalQueue.forEach((callback) => {
            notifyFn(callback)
          })
        })
      })
    }
  }

  /**
   * Use this method to set a custom notify function.
   * This can be used to for example wrap notifications with `React.act` while running tests.
   */
  const setNotifyFunction = (fn: NotifyFunction) => {
    notifyFn = fn
  }

  /**
   * Use this method to set a custom function to batch notifications together into a single tick.
   * By default React Query will use the batch function provided by ReactDOM or React Native.
   */
  const setBatchNotifyFunction = (fn: BatchNotifyFunction) => {
    batchNotifyFn = fn
  }

  return {
    batch,
    batchCalls,
    schedule,
    setNotifyFunction,
    setBatchNotifyFunction,
  } as const
}

// SINGLETON
export const scheduleManager = createNotifyManager()
