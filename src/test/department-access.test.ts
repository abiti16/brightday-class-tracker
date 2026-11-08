import {describe,it,expect} from "vitest";
import {hasAttendancePermission,DEFAULT_PERMISSIONS} from "@/lib/department-access";
describe("explicit super-admin-controlled attendance grants",()=>{
 const date="2026-11-08";const member={department_id:"course",role:"teacher" as const,can_take:true,can_edit:false};
 it("take grant allows initial attendance",()=>expect(hasAttendancePermission(false,member,"course",date,date,false)).toBe(true));
 it("take grant alone cannot edit saved attendance",()=>expect(hasAttendancePermission(false,member,"course",date,date,true)).toBe(false));
 it("editing requires both grant and department rule",()=>{expect(hasAttendancePermission(false,{...member,can_edit:true},"course",date,date,true)).toBe(false);expect(hasAttendancePermission(false,{...member,can_edit:true},"course",date,date,true,{...DEFAULT_PERMISSIONS,teacher_edit_today:true})).toBe(true);});
 it("ungranted staff cannot record",()=>expect(hasAttendancePermission(false,{...member,can_take:false},"course",date,date,false)).toBe(false));
 it("cross-department access is blocked",()=>expect(hasAttendancePermission(false,member,"other",date,date,false)).toBe(false));
 it("super admin retains non-future access",()=>expect(hasAttendancePermission(true,null,"other","2026-11-07",date,true)).toBe(true));
 it("future dates remain blocked for super admin",()=>expect(hasAttendancePermission(true,null,"course","2026-11-09",date,false)).toBe(false));
 it("past corrections need explicit manager edit grant",()=>{const manager={...member,role:"manager" as const};expect(hasAttendancePermission(false,manager,"course","2026-11-07",date,true)).toBe(false);expect(hasAttendancePermission(false,{...manager,can_edit:true},"course","2026-11-07",date,true)).toBe(true);});
});