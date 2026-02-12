import AuthForm from '@/components/AuthForm';
import styles from './page.module.css';

export default function LoginPage() {
    return (
        <main className={styles.main}>
            <div className={styles.container}>
                {/* Left side - Form */}
                <div className={styles.formSection}>
                    <div className={styles.formWrapper}>
                        <h1 className={styles.title}>AsymLAB</h1>
                        <p className={styles.subtitle}>
                            Sistema de Gestão Clínica
                        </p>
                        <AuthForm />
                    </div>
                </div>

                {/* Right side - Negative space with accent */}
                <div className={styles.accentSection}>
                    <div className={styles.accentBar}></div>
                </div>
            </div>
        </main>
    );
}
