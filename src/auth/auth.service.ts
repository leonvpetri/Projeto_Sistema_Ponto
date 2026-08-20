import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existente = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existente) throw new ConflictException('E-mail já cadastrado');

    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, nome: dto.nome, senhaHash, role: dto.role },
    });

    return this.assinarToken(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const senhaValida = await bcrypt.compare(dto.senha, user.senhaHash);
    if (!senhaValida) throw new UnauthorizedException('Credenciais inválidas');

    return this.assinarToken(user.id, user.email, user.role);
  }

  private assinarToken(sub: string, email: string, role: string) {
    return {
      accessToken: this.jwt.sign({ sub, email, role }),
    };
  }
}
