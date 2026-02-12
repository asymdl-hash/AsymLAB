import AuthForm from '@/components/AuthForm';
import styles from './page.module.css';

export default function LoginPage() {
    return (
        <main className={styles.main}>
            <div className={styles.container}>
                <div className={styles.formSection}>
                    <div className={styles.formWrapper}>
                        <h1 className={styles.title}>AsymLAB</h1>
                        <p className={styles.subtitle}>
                            Sistema de Gestão
                        </p>
                        <AuthForm />
                    </div>
                </div>
            </div>
        </main>
    );
}
