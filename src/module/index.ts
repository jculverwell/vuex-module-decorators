import {GetterTree, Module as Mod} from 'vuex'
import {DynamicModuleOptions, ModuleOptions} from '../moduleoptions'
import {stateFactory as sf} from './stateFactory'
import {
  staticActionGenerators,
  staticGetterGenerator,
  staticMutationGenerator,
  staticStateGenerator
} from './staticGenerators'

function moduleDecoratorFactory<S>(moduleOptions: ModuleOptions) {

  return function <TFunction extends Function>(constructor: TFunction): TFunction | void {
    const module: Function & Mod<S, any> = constructor
    const stateFactory = () => sf(module)

    if (!module.state) {
      module.state = (moduleOptions && (<ModuleOptions>moduleOptions).stateFactory) ? stateFactory : stateFactory()
    }

    if (!module.getters) {
      module.getters = {} as GetterTree<S, any>
    }
    module.namespaced = moduleOptions && moduleOptions.namespaced
    Object.getOwnPropertyNames(module.prototype).forEach((funcName: string) => {
      const descriptor = Object.getOwnPropertyDescriptor(module.prototype, funcName)
      if (descriptor.get) {
        module.getters[funcName] = (moduleState: S) => descriptor.get.call(moduleState)
      }
    })
    if ((<DynamicModuleOptions>moduleOptions).dynamic) {
      const modOpt: DynamicModuleOptions = moduleOptions as DynamicModuleOptions

      if (!modOpt.name) {
        throw new Error('Name of module not provided in decorator options')
      }

      let statics = {}
      // ===========  For statics ==============
      // ------ state -------
      staticStateGenerator(module, modOpt, statics)

      // ------- getters -------
      if (module.getters) {
        staticGetterGenerator(module, modOpt, statics)
      }

      // -------- mutations --------
      if (module.mutations) {
        staticMutationGenerator(module, modOpt, statics)
      }
      // -------- actions ---------
      if (module.actions) {
        staticActionGenerators(module, modOpt, statics)
      }

      modOpt.store.registerModule(
        modOpt.name,              // TODO: Handle nested modules too in future
        module
      )

      Object.defineProperty(constructor, '_statics', {
        value: statics
      })

      return constructor
    }
  }

}

export function Module<S>(module: Function & Mod<S, any>): void
export function Module<S>(options: ModuleOptions): ClassDecorator

export function Module<S>(modOrOpt: ModuleOptions | Function & Mod<S, any>) {
  if (typeof modOrOpt === 'function') {
    /*
     * @Module decorator called without options (directly on the class definition)
     */
    moduleDecoratorFactory({})(modOrOpt)
  } else {
    /*
     * @Module({...}) decorator called with options
     */
    return moduleDecoratorFactory(modOrOpt)
  }
}
