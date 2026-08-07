import { User } from '../models/User.js';

let demoUserId = null;

export async function getDemoSalesExecutiveId() {
  if (demoUserId) return demoUserId;

  let user = await User.findOne({ email: 'sales@infinitylearn.com' });
  if (!user) {
    user = await User.create({
      name: 'Sales Copilot',
      email: 'sales@infinitylearn.com',
      password: 'demo1234',
      role: 'sales_executive',
    });
  }

  demoUserId = user._id;
  return demoUserId;
}
