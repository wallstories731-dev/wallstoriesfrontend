import {test} from 'node:test';
import assert from 'node:assert/strict';
import {editTag,tagNames,csvCell} from '../src/lib/adminControls.ts';
import type {Poster} from '../src/data/shop.ts';
test('tag rename and removal preserve original posters and collapse duplicate tags',()=>{
 const rows=[{id:'p1',tags:['Cinema','new']},{id:'p2',tags:['film','cinema']}] as Poster[];
 const renamed=editTag(rows,'CINEMA','film');assert.deepEqual(renamed.map(p=>p.tags),[['film','new'],['film']]);assert.deepEqual(rows[0].tags,['Cinema','new']);assert.deepEqual(editTag(renamed,'film').map(p=>p.tags),[['new'],[]]);assert.deepEqual(tagNames(' New, new, cinema, '),['new','cinema']);assert.throws(()=>editTag(rows,'cinema',''));
});
test('CSV exports escape quotes/newlines and neutralize spreadsheet formulas',()=>{
 for(const value of ['=SUM(1,2)','+123','-1','@cmd',' \t=HYPERLINK("bad")'])assert.ok(csvCell(value).startsWith('"\''));assert.equal(csvCell('line 1\n"line 2"'),'"line 1\n""line 2"""');assert.equal(csvCell('customer'),'"customer"');
});
