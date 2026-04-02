export type Status = 'active' | 'archived'

export interface User {
  id: string;
  name: string;
  status: Status;
}
