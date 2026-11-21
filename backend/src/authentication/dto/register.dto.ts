import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

import {
  NAME_REGEX,
  PASSWORD_REGEX,
} from '../constants/auth-validation.constants';

export class RegisterDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsEmail({}, {
    message: 'Please enter a valid email address',
  })
  email: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(3, {
    message: 'Name must contain at least 3 characters',
  })
  @MaxLength(80, {
    message: 'Name cannot exceed 80 characters',
  })
  @Matches(NAME_REGEX, {
    message: 'Name contains invalid characters',
  })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, {
    message: 'Password must contain at least 8 characters',
  })
  @MaxLength(128, {
    message: 'Password cannot exceed 128 characters',
  })
  @Matches(PASSWORD_REGEX, {
    message: 'Password does not meet security requirements',
  })
  password: string;
}

export default RegisterDto;
