import { UserRole } from '@plant/db';

// The "has an NgoProfile" role. group/nursery/corporate used to be folded into this
// list (they shared NgoProfile), but each now has its own dedicated profile model
// and dashboard — see GroupProfile/NurseryProfile/CorporateProfile and their own
// route/service files, not ngo.routes.ts/ngo.service.ts.
export const ORG_ROLES: UserRole[] = ['ngo'];
