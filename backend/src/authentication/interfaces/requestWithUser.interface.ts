import { Request } from 'express';
import User from '../../users/entities/users.entity';
 
export interface RequestWithUser extends Request {
  user: User;
}