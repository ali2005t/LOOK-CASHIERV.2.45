document.addEventListener("DOMContentLoaded", () => {
  // تحديث الخطوات تدريجياً
  const steps = ['step-1', 'step-2', 'step-3'];
  const progressBar = document.getElementById('progress-bar');
  let currentStep = 0;
  
  const stepInterval = setInterval(() => {
    if (currentStep < steps.length) {
      const stepElement = document.getElementById(steps[currentStep]);
      stepElement.classList.add('active');
      
      // بعد 0.8 ثانية، تحديثها كـ completed
      setTimeout(() => {
        stepElement.classList.remove('active');
        stepElement.classList.add('completed');
        
        // تحديث الـ icon
        const icon = stepElement.querySelector('i');
        icon.className = 'fas fa-check-circle';
        
        // تحديث progress bar
        progressBar.style.width = ((currentStep + 1) / steps.length * 100) + '%';
      }, 800);
      
      currentStep++;
    } else {
      clearInterval(stepInterval);
    }
  }, 1000);
  
  /* الانتقال إلى html/login.html بعد 4.5 ثوانٍ مع تأثير fade */
  setTimeout(() => {
    progressBar.style.width = '100%';
    
    // تأثير fade out
    document.body.style.transition = 'opacity 0.6s ease-out';
    document.body.style.opacity = '0';
    
    // الانتقال للصفحة التالية
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 600);
  }, 4500);
});

