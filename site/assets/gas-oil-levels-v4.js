// 配表归属整理；全部棋盘、预算、评星数值与验证路线保持不变。
import {OIL_LEVEL_DESIGN as previous} from './gas-oil-levels-v3.js?v=20261013-v3';
export const OIL_LEVEL_DESIGN=structuredClone(previous);
OIL_LEVEL_DESIGN.version='2026-10-13-draft4';
OIL_LEVEL_DESIGN.source_ref='assets/gas-oil-levels-v4.js';
OIL_LEVEL_DESIGN.config_schema='challenge-board-v1';
OIL_LEVEL_DESIGN.challenges=previous.challenges.map(c=>({
 challenge_id:c.challenge_id,type:c.type,board_ids:[...c.board_ids],initial_drops:c.initial_drops,
 star_evaluation:{mode:c.type===2?'cleared_boards':'remaining_drops',params:[...(c.type===2?c.cleared_star_thresholds:c.remaining_star_thresholds)]},
 reward_group_ids:[null,null,null],unlock_condition_id:null,verification:structuredClone(c.verification)
}));
OIL_LEVEL_DESIGN.boards=previous.boards.map(b=>{
 const copy=structuredClone(b);
 delete copy.type;delete copy.initial_drops;delete copy.remaining_star_thresholds;delete copy.cleared_star_thresholds;
 return copy;
});

