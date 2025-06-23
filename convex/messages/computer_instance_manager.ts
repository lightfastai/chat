import {
  type CreateInstanceOptions,
  type Instance,
  type LightfastComputerSDK,
  createLightfastComputer,
} from "@lightfastai/computer"
import type { Id } from "../_generated/dataModel.js"

// Cache for SDK instances per thread
const sdkCache = new Map<string, LightfastComputerSDK>()

// Cache for Computer instances per thread
const instanceCache = new Map<string, Instance>()

/**
 * Computer Instance Manager
 *
 * Manages the lifecycle of Lightfast Computer instances,
 * ensuring proper initialization and cleanup per thread.
 */
export class ComputerInstanceManager {
  private threadId: Id<"threads">
  private sdk: LightfastComputerSDK | null = null
  private flyApiToken: string
  private flyAppName: string

  constructor({
    threadId,
    flyApiToken,
    flyAppName,
  }: { threadId: Id<"threads">; flyApiToken: string; flyAppName: string }) {
    this.threadId = threadId
    this.flyApiToken = flyApiToken
    this.flyAppName = flyAppName
  }

  /**
   * Initialize the SDK if not already initialized
   */
  private async initializeSDK(): Promise<LightfastComputerSDK> {
    // Check cache first
    const cachedSDK = sdkCache.get(this.threadId)
    if (cachedSDK) {
      this.sdk = cachedSDK
      return cachedSDK
    }

    // Create new SDK instance
    const sdk = createLightfastComputer({
      flyApiToken: this.flyApiToken,
      appName: this.flyAppName,
    })

    // Cache it
    sdkCache.set(this.threadId, sdk)
    this.sdk = sdk

    return sdk
  }

  /**
   * Get the SDK instance
   */
  async getSDK(): Promise<LightfastComputerSDK> {
    if (!this.sdk) {
      return await this.initializeSDK()
    }
    return this.sdk
  }

  /**
   * Get or create a Computer instance for this thread
   */
  async getOrCreateInstance(existingInstanceId?: string): Promise<Instance> {
    // Check cache first
    const cachedInstance = instanceCache.get(this.threadId)
    if (cachedInstance && cachedInstance.status === "running") {
      console.log(
        `Using cached instance for thread ${this.threadId}: ${cachedInstance.id}`,
      )
      return cachedInstance
    }

    // Initialize SDK if needed
    const sdk = await this.initializeSDK()

    // If existingInstanceId is provided, try to get that specific instance
    if (existingInstanceId) {
      const getResult = await sdk.instances.get(existingInstanceId)
      if (getResult.isOk() && getResult.value.status === "running") {
        const instance = getResult.value
        console.log(`Using existing thread instance: ${instance.id}`)
        instanceCache.set(this.threadId, instance)
        return instance
      }
    }

    // Check for existing thread-specific instances
    const listResult = await sdk.instances.list()
    if (listResult.isOk()) {
      // First, look for instances specifically tied to this thread
      const threadInstances = listResult.value.filter(
        (i) =>
          i.status === "running" &&
          (i.name === `computer-${this.threadId}` ||
            i.metadata?.threadId === this.threadId),
      )

      if (threadInstances.length > 0) {
        const instance = threadInstances[0]
        console.log(`Found existing thread instance: ${instance.id}`)
        instanceCache.set(this.threadId, instance)
        return instance
      }
    }

    // Create new instance
    console.log(`Creating new Computer instance for thread ${this.threadId}...`)

    const createOptions: CreateInstanceOptions = {
      name: `computer-${this.threadId}`,
      region: "iad", // US East (Washington DC)
      size: "shared-cpu-2x",
      memoryMb: 512,
      metadata: {
        purpose: "chat-assistant",
        createdBy: "chat-app",
        threadId: this.threadId,
      },
    }

    const createResult = await sdk.instances.create(createOptions)
    if (createResult.isErr()) {
      throw new Error(
        `Failed to create instance: ${createResult.error.message}`,
      )
    }

    // Wait for instance to be running
    let instance = createResult.value
    let attempts = 0

    while (instance.status !== "running" && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const getResult = await sdk.instances.get(instance.id)
      if (getResult.isOk()) {
        instance = getResult.value
      }
      attempts++
    }

    if (instance.status !== "running") {
      throw new Error(`Instance failed to start: ${instance.status}`)
    }

    console.log(`Created new instance: ${instance.id}`)

    // Cache the instance
    instanceCache.set(this.threadId, instance)

    return instance
  }

  /**
   * Check if an instance exists and is running for this thread
   */
  async hasRunningInstance(): Promise<boolean> {
    try {
      const cachedInstance = instanceCache.get(this.threadId)
      if (cachedInstance && cachedInstance.status === "running") {
        return true
      }

      const sdk = await this.initializeSDK()
      const listResult = await sdk.instances.list()

      if (listResult.isOk()) {
        return listResult.value.some(
          (i) =>
            i.status === "running" &&
            (i.name === `computer-${this.threadId}` ||
              i.metadata?.threadId === this.threadId),
        )
      }

      return false
    } catch {
      return false
    }
  }

  /**
   * Stop the instance for this thread
   */
  async stopInstance(): Promise<void> {
    const instance = instanceCache.get(this.threadId)
    if (!instance) return

    const sdk = await this.initializeSDK()
    const result = await sdk.instances.stop(instance.id)

    if (result.isOk()) {
      console.log(`Stopped instance ${instance.id} for thread ${this.threadId}`)
      instanceCache.delete(this.threadId)
    }
  }

  /**
   * Clean up resources
   */
  static cleanup(threadId: string) {
    instanceCache.delete(threadId)
    sdkCache.delete(threadId)
  }
}
