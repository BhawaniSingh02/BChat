PS C:\Users\bhoni\OneDrive\Desktop\Chat App\chat-app-backend> ./gradlew clean build -x test

FAILURE: Build failed with an exception.

* What went wrong:
Could not determine the dependencies of task ':bootJar'.
> Could not resolve all dependencies for configuration ':runtimeClasspath'.
   > Failed to calculate the value of task ':compileJava' property 'javaCompiler'.
      > Cannot find a Java installation on your machine (Windows 11 10.0 amd64) matching: {languageVersion=21, vendor=any vendor, implementation=vendor-specific, nativeImageCapable=false}. Toolchain download repositories have not been configured.

* Try:
> Learn more about toolchain auto-detection and auto-provisioning at https://docs.gradle.org/8.14/userguide/toolchains.html#sec:auto_detection.
> Learn more about toolchain repositories at https://docs.gradle.org/8.14/userguide/toolchains.html#sub:download_repositories.
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

BUILD FAILED in 35s