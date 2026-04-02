export class UserRepository {
  async findById(id: string) {
    return { id, name: 'Test', status: 'active' };
  }
}
