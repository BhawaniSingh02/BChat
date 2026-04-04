# Build stage
FROM eclipse-temurin:24-jdk AS build
WORKDIR /app
COPY . .
RUN chmod +x gradlew && ./gradlew build -x test --no-daemon -Porg.gradle.java.installations.auto-download=false

# Run stage
FROM eclipse-temurin:24-jre
WORKDIR /app
COPY --from=build /app/build/libs/chat-app-backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Djdk.tls.client.protocols=TLSv1.2,TLSv1.3", "-Dhttps.protocols=TLSv1.2,TLSv1.3", "-jar", "app.jar"]
