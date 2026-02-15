import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Este endpoint precisa de Node.js runtime (nodemailer não funciona em edge)
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { to, subject, html, text } = body;

        if (!to || !subject || (!html && !text)) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: to, subject, e html ou text' },
                { status: 400 }
            );
        }

        const gmailUser = process.env.GMAIL_USER;
        const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

        if (!gmailUser || !gmailAppPassword) {
            return NextResponse.json(
                { error: 'Configuração de email não encontrada. Contacte o administrador.' },
                { status: 500 }
            );
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailUser,
                pass: gmailAppPassword,
            },
        });

        await transporter.sendMail({
            from: `"AsymLAB" <${gmailUser}>`,
            to,
            subject,
            text: text || undefined,
            html: html || undefined,
        });

        return NextResponse.json({
            success: true,
            message: 'Email enviado com sucesso'
        });
    } catch (error: any) {
        console.error('Error sending email:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao enviar email' },
            { status: 500 }
        );
    }
}
