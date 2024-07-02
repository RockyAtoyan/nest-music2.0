import { IsNotEmpty } from 'class-validator';

export class EditDto {
  login: string;
  password: string;
}
