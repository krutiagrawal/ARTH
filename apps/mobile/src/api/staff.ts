import { apiFetch } from './client';

export interface ApiStaffMember {
  id: string;
  name: string;
  role: string;
  contactEmail: string | null;
  contactPhone: string | null;
  photoUrl: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface CreateStaffInput {
  name: string;
  role: string;
  contactEmail?: string;
  contactPhone?: string;
  photo?: { uri: string; name: string; type: string };
}

export interface UpdateStaffInput {
  name?: string;
  role?: string;
  contactEmail?: string;
  contactPhone?: string;
  photo?: { uri: string; name: string; type: string };
}

function toStaffForm(input: CreateStaffInput | UpdateStaffInput): FormData {
  const form = new FormData();
  if (input.name !== undefined) form.append('name', input.name);
  if (input.role !== undefined) form.append('role', input.role);
  if (input.contactEmail !== undefined) form.append('contactEmail', input.contactEmail);
  if (input.contactPhone !== undefined) form.append('contactPhone', input.contactPhone);
  if (input.photo) {
    form.append('photo', { uri: input.photo.uri, name: input.photo.name, type: input.photo.type } as unknown as Blob);
  }
  return form;
}

export async function fetchStaff(): Promise<ApiStaffMember[]> {
  return apiFetch<ApiStaffMember[]>('/api/ngo/staff');
}

export async function createStaff(input: CreateStaffInput): Promise<ApiStaffMember> {
  return apiFetch<ApiStaffMember>('/api/ngo/staff', { method: 'POST', body: toStaffForm(input), isForm: true });
}

export async function updateStaff(id: string, input: UpdateStaffInput): Promise<ApiStaffMember> {
  return apiFetch<ApiStaffMember>(`/api/ngo/staff/${id}`, { method: 'PATCH', body: toStaffForm(input), isForm: true });
}

export async function deleteStaff(id: string): Promise<void> {
  await apiFetch<void>(`/api/ngo/staff/${id}`, { method: 'DELETE' });
}
