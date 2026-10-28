import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

// 프로젝트 TypeScript를 메모리에서 변환한다. 테스트용 패키지나 DB 연결 없이
// 실제 핸들러를 실행하며, 테스트마다 명시적으로 주입한 경계만 대체한다.
export function sourceLoader(mocks = {}) {
  const cache = new Map()
  function load(relative) {
    const filename = path.resolve(relative)
    if (cache.has(filename)) return cache.get(filename).exports
    const source = readFileSync(filename, 'utf8')
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    const module = { exports: {} }
    cache.set(filename, module)
    const nativeRequire = createRequire(filename)
    const require = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id]
      if (id.startsWith('@/')) {
        const sourcePath = `src/${id.slice(2)}`
        return load(sourcePath + (id.startsWith('@/components/') ? '.tsx' : '.ts'))
      }
      return nativeRequire(id)
    }
    vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(require, module, module.exports)
    return module.exports
  }
  return load
}
