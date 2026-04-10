Error starting ApplicationContext. To display the condition evaluation report re-run your application with 'debug' enabled.
2026-04-10T18:24:10.965Z ERROR 1 --- [chat-app-backend] [           main] o.s.boot.SpringApplication               : Application run failed

org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean with name 'authController' defined in URL [jar:nested:/app/app.jar/!BOOT-INF/classes/!/com/substring/chat/controllers/AuthController.class]: Unsatisfied dependency expressed through constructor parameter 0: Error creating bean with name 'authService' defined in URL [jar:nested:/app/app.jar/!BOOT-INF/classes/!/com/substring/chat/services/AuthService.class]: Unsatisfied dependency expressed through constructor parameter 7: Error creating bean with name 'emailService': Injection of autowired dependencies failed

Caused by: org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean with name 'authService' defined in URL [jar:nested:/app/app.jar/!BOOT-INF/classes/!/com/substring/chat/services/AuthService.class]: Unsatisfied dependency expressed through constructor parameter 7: Error creating bean with name 'emailService': Injection of autowired dependencies failed

Caused by: org.springframework.beans.factory.BeanCreationException: Error creating bean with name 'emailService': Injection of autowired dependencies failed

Exited with status 1