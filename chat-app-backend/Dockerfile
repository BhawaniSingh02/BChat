# Build stage - use JDK 24 with the project's own Gradle wrapper
FROM eclipse-temurin:24-jdk AS build
WORKDIR /app
COPY . .
RUN ./gradlew build -x test --no-daemon

# Run stage
FROM eclipse-temurin:24-jre
WORKDIR /app
COPY --from=build /app/build/libs/chat-app-backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
