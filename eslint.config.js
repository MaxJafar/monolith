// SPDX-License-Identifier: 0BSD
import {createJiti} from 'jiti'
const loader=createJiti(import.meta.url)
export default await loader.import('./eslint/config.ts',{default:true})
