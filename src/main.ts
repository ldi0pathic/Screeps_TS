import {ErrorMapper} from "utils/ErrorMapper";
import {Mem} from "./utils/Memory";
import {Jobs} from "./utils/Jobs";


export const loop = ErrorMapper.wrapLoop(() => {

    Mem.clean();

    Jobs.loop();
    Jobs.spawn();

});