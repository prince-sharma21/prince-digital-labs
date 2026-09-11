(async () => {
  const settings = await Site.boot("about.html");
  const photo = document.getElementById("founderTeaserPhoto");
  if (photo) photo.src = settings.founder_photo_url || "/images/founder.jpg";
  Site.initRevealAnimations();
})();
