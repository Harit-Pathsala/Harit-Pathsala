import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, stagger } from 'animejs';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';
import { LOCATIONS } from '../game/locations.js';

// journey order (easy to hard) and hand-placed positions on a 1000x580 winding trail
const ROUTE = ['apihimal', 'dadeldhura', 'mahendranagar', 'dhangadhi', 'bardiya', 'baglung', 'kaligandaki', 'pokhara', 'tansen', 'butwal', 'lumbini', 'gorkha', 'chitwan', 'kathmandu_x', 'dhulikhel', 'panchkhal', 'janakpur', 'himalaya'];
const NEPAL_D = 'M 178.9,87.6 L 178.7,88.8 L 179.9,89.6 L 181.5,89.0 L 183.3,87.0 L 186.7,87.0 L 187.3,87.6 L 187.9,90.8 L 190.0,93.3 L 190.0,96.9 L 192.0,97.3 L 192.4,98.1 L 196.0,98.9 L 196.8,99.7 L 196.8,101.1 L 198.6,101.5 L 199.0,103.5 L 201.0,105.3 L 201.6,107.8 L 204.3,110.0 L 207.5,114.6 L 208.3,116.6 L 208.3,118.8 L 198.6,127.1 L 195.8,132.7 L 193.8,133.5 L 189.8,137.0 L 183.9,136.8 L 181.3,137.6 L 179.9,139.0 L 178.3,145.0 L 175.9,148.4 L 173.3,150.0 L 168.4,150.8 L 166.4,151.5 L 164.8,153.1 L 163.8,155.5 L 161.0,157.7 L 160.6,160.9 L 162.4,167.0 L 164.2,170.8 L 164.2,173.2 L 159.0,177.4 L 158.1,180.9 L 156.5,182.9 L 151.3,187.5 L 149.7,191.5 L 149.9,193.5 L 151.5,195.6 L 153.7,201.2 L 155.5,204.0 L 155.5,206.4 L 153.9,208.8 L 151.7,209.8 L 150.3,211.3 L 150.1,214.1 L 150.7,215.5 L 150.7,217.3 L 147.3,217.3 L 145.9,217.9 L 141.8,222.5 L 140.4,226.0 L 140.0,231.4 L 137.6,234.6 L 135.6,238.4 L 133.8,243.1 L 134.2,249.1 L 135.2,252.5 L 136.6,254.3 L 138.6,254.7 L 140.8,253.5 L 142.8,253.5 L 145.3,256.4 L 152.7,260.8 L 155.3,264.0 L 157.5,264.4 L 158.4,265.4 L 159.6,268.6 L 161.6,270.5 L 165.0,271.9 L 170.0,271.9 L 172.0,275.5 L 176.5,279.9 L 177.7,280.1 L 178.3,279.7 L 179.5,277.7 L 177.5,267.8 L 179.1,266.6 L 181.1,266.6 L 181.7,268.8 L 182.9,270.3 L 189.0,271.9 L 191.4,276.1 L 192.8,277.5 L 194.2,278.3 L 197.4,278.7 L 200.4,282.3 L 205.5,285.4 L 209.3,286.0 L 211.1,289.2 L 213.7,289.6 L 216.9,291.8 L 219.4,291.6 L 220.2,294.0 L 221.8,295.2 L 225.4,295.2 L 226.0,296.8 L 236.7,299.2 L 238.3,300.9 L 238.5,304.5 L 239.5,306.9 L 245.7,314.3 L 245.7,315.8 L 244.7,317.8 L 246.9,321.6 L 249.0,321.8 L 252.8,320.2 L 254.6,318.2 L 256.6,318.2 L 260.0,323.4 L 260.0,326.0 L 260.6,327.0 L 265.3,329.3 L 274.1,335.1 L 280.0,336.5 L 285.8,341.7 L 297.3,349.6 L 298.7,349.8 L 300.3,349.2 L 303.3,344.6 L 305.3,343.1 L 306.7,342.5 L 310.6,342.7 L 312.4,343.7 L 317.0,348.4 L 318.6,349.2 L 321.9,349.4 L 323.5,350.2 L 331.7,357.0 L 337.8,360.7 L 341.8,365.1 L 345.0,367.1 L 348.0,367.5 L 357.9,365.9 L 363.9,364.1 L 366.1,364.1 L 368.0,366.9 L 370.6,373.8 L 370.8,378.4 L 370.2,384.0 L 370.8,384.8 L 377.6,385.4 L 385.9,385.0 L 387.7,385.6 L 390.5,388.6 L 396.8,390.1 L 410.0,389.7 L 412.9,393.3 L 416.3,395.7 L 417.5,399.7 L 420.5,401.9 L 423.1,402.1 L 425.3,401.5 L 428.4,398.9 L 431.6,393.1 L 430.6,390.3 L 430.6,388.6 L 432.0,387.6 L 447.5,388.2 L 460.8,394.9 L 468.8,399.9 L 469.8,400.1 L 470.9,399.1 L 470.9,394.3 L 471.5,392.9 L 472.5,392.1 L 472.7,390.3 L 474.3,390.3 L 475.1,391.1 L 476.1,390.5 L 477.7,390.5 L 478.3,391.1 L 485.8,391.5 L 487.6,390.3 L 489.2,387.6 L 491.8,385.0 L 493.4,385.0 L 494.8,386.4 L 498.2,388.2 L 500.3,391.1 L 504.1,390.5 L 504.9,391.7 L 505.5,395.1 L 507.1,396.3 L 513.1,397.7 L 525.6,399.3 L 526.4,400.1 L 529.4,400.1 L 535.5,401.5 L 536.3,402.1 L 538.7,406.2 L 540.7,412.8 L 540.5,419.1 L 539.5,422.5 L 537.1,427.3 L 537.3,429.3 L 538.5,430.7 L 549.2,435.2 L 550.8,435.4 L 553.4,434.2 L 555.2,434.2 L 556.8,436.4 L 558.8,437.6 L 565.3,439.0 L 565.9,439.6 L 565.7,442.2 L 566.1,443.0 L 570.5,446.2 L 570.7,448.9 L 571.9,449.7 L 575.8,450.3 L 579.8,448.3 L 584.6,448.3 L 585.0,448.7 L 585.0,450.5 L 584.2,452.3 L 584.4,455.1 L 586.8,458.1 L 589.2,459.1 L 593.5,459.5 L 597.1,460.5 L 599.5,460.5 L 601.5,459.7 L 605.2,456.9 L 609.2,456.7 L 612.4,455.7 L 620.9,450.1 L 625.5,449.5 L 628.7,450.5 L 630.9,451.9 L 632.7,454.5 L 631.9,465.4 L 633.1,468.6 L 636.2,471.8 L 640.8,474.2 L 642.2,475.6 L 643.0,477.6 L 644.2,478.3 L 646.0,477.7 L 650.3,474.4 L 653.1,473.6 L 653.9,472.6 L 654.1,471.2 L 655.5,469.8 L 657.9,469.2 L 660.3,469.2 L 663.8,470.2 L 666.6,471.8 L 668.6,474.4 L 670.2,474.8 L 671.2,474.2 L 673.0,474.2 L 674.6,476.0 L 675.8,476.4 L 678.0,475.8 L 680.7,473.6 L 684.3,473.4 L 690.5,475.4 L 697.4,479.1 L 703.4,481.3 L 705.8,483.5 L 706.6,485.3 L 721.3,492.6 L 723.2,492.5 L 724.8,490.5 L 726.4,490.5 L 727.6,491.1 L 730.4,490.9 L 734.6,488.7 L 738.1,484.3 L 738.3,483.1 L 744.7,482.7 L 746.7,481.7 L 748.3,480.1 L 750.1,480.1 L 751.7,488.3 L 752.8,490.5 L 754.6,492.3 L 759.2,494.4 L 765.6,494.0 L 766.6,494.8 L 767.7,497.6 L 771.1,498.4 L 774.3,500.0 L 775.7,500.0 L 776.9,499.0 L 777.5,495.6 L 778.9,493.8 L 785.6,491.5 L 787.8,491.5 L 789.6,492.1 L 792.4,493.8 L 795.4,496.6 L 797.7,497.0 L 803.3,495.0 L 805.1,492.8 L 806.7,492.8 L 809.7,494.6 L 811.3,494.4 L 813.2,492.8 L 814.8,490.3 L 816.4,490.3 L 818.0,491.3 L 819.0,491.3 L 821.2,489.3 L 822.8,489.3 L 826.6,493.8 L 830.1,496.0 L 831.7,498.4 L 834.9,498.8 L 836.1,498.0 L 836.7,495.8 L 841.8,490.7 L 842.8,487.9 L 842.2,484.3 L 842.6,479.7 L 847.8,469.6 L 849.4,463.6 L 849.8,454.5 L 849.0,451.1 L 849.0,447.0 L 847.2,444.8 L 846.0,440.6 L 844.8,438.8 L 845.0,434.4 L 842.8,433.4 L 840.1,429.5 L 836.9,429.1 L 836.3,428.5 L 835.5,424.5 L 834.1,423.3 L 833.7,420.9 L 835.5,416.8 L 835.3,411.8 L 836.1,408.2 L 839.3,400.3 L 839.1,398.5 L 837.7,396.1 L 838.1,393.7 L 840.5,391.5 L 840.5,390.1 L 838.9,386.4 L 839.3,381.2 L 845.0,370.3 L 847.0,365.5 L 847.4,361.9 L 850.6,356.2 L 850.4,351.6 L 851.2,350.6 L 851.4,349.2 L 849.0,346.8 L 846.8,345.8 L 842.8,345.0 L 837.3,342.7 L 835.1,342.5 L 830.5,343.1 L 829.1,341.9 L 826.6,340.9 L 822.0,341.1 L 820.2,338.3 L 818.6,337.5 L 817.4,337.5 L 812.2,344.0 L 810.3,348.4 L 807.5,351.4 L 805.5,351.4 L 803.7,349.2 L 802.7,348.8 L 799.7,349.8 L 797.9,349.8 L 796.8,347.2 L 795.4,346.2 L 793.4,346.4 L 791.2,348.0 L 788.2,348.0 L 786.0,349.0 L 784.0,349.0 L 782.4,346.6 L 781.3,346.4 L 777.1,348.2 L 775.3,349.8 L 773.5,349.8 L 769.9,347.8 L 768.3,347.6 L 763.8,350.0 L 759.4,350.2 L 757.8,349.8 L 756.2,348.6 L 755.2,345.8 L 751.5,340.1 L 749.5,338.1 L 747.1,337.1 L 742.9,337.3 L 741.7,336.9 L 736.8,332.7 L 732.8,330.1 L 728.4,330.7 L 726.2,329.7 L 725.0,328.6 L 724.8,325.0 L 723.2,323.0 L 720.1,321.8 L 717.5,321.8 L 715.1,322.8 L 713.5,324.6 L 711.9,324.6 L 710.3,322.2 L 708.5,321.4 L 706.6,321.6 L 705.4,322.8 L 705.2,326.6 L 703.4,328.4 L 702.2,330.5 L 701.0,335.3 L 701.0,337.1 L 697.8,338.3 L 695.8,341.7 L 694.2,341.7 L 691.7,339.5 L 687.1,336.9 L 681.9,334.7 L 678.2,334.5 L 678.2,331.3 L 677.2,327.6 L 677.2,325.2 L 678.0,322.8 L 676.0,319.2 L 674.8,315.8 L 674.2,315.4 L 672.8,315.4 L 671.8,316.2 L 670.6,319.4 L 668.4,322.0 L 665.0,323.2 L 663.5,324.4 L 663.3,325.6 L 663.8,327.2 L 663.5,331.9 L 665.6,337.7 L 665.4,340.1 L 664.2,341.3 L 662.5,341.9 L 660.3,341.9 L 657.3,341.1 L 655.1,339.5 L 655.1,337.9 L 656.5,335.5 L 656.3,333.7 L 650.3,328.2 L 649.7,324.0 L 647.2,319.8 L 645.6,315.8 L 643.2,313.7 L 639.0,312.1 L 637.0,310.1 L 635.8,307.3 L 635.4,302.5 L 634.0,296.0 L 633.1,294.6 L 629.9,294.2 L 629.1,294.8 L 626.5,299.9 L 625.3,304.3 L 623.7,304.3 L 622.9,302.3 L 620.5,301.9 L 613.0,299.2 L 606.6,299.5 L 605.2,300.5 L 603.5,303.9 L 601.9,303.9 L 600.3,302.3 L 599.1,302.3 L 596.5,303.5 L 594.7,303.5 L 592.7,302.5 L 589.7,299.5 L 588.6,299.0 L 585.4,299.5 L 581.4,299.2 L 581.2,297.2 L 581.8,296.4 L 582.0,294.6 L 580.6,290.0 L 580.6,287.8 L 584.0,284.8 L 587.4,280.3 L 587.4,274.1 L 588.2,272.5 L 588.2,270.7 L 587.0,269.0 L 584.0,267.8 L 581.4,265.2 L 578.6,264.4 L 576.2,264.4 L 573.1,265.8 L 566.7,273.1 L 561.7,273.1 L 558.0,274.7 L 556.0,274.7 L 551.6,272.1 L 545.8,270.1 L 545.0,269.0 L 544.6,266.0 L 541.9,264.4 L 539.3,260.6 L 537.7,259.4 L 534.3,258.4 L 528.8,258.4 L 524.2,257.8 L 522.8,256.4 L 520.4,250.3 L 517.6,247.3 L 514.7,246.1 L 509.5,245.5 L 507.3,244.5 L 505.9,243.1 L 503.3,243.1 L 502.9,242.7 L 502.9,241.1 L 505.1,233.0 L 505.1,230.2 L 503.9,228.4 L 500.3,227.0 L 501.1,221.7 L 498.8,219.7 L 498.2,218.5 L 498.2,215.5 L 500.5,213.3 L 501.1,211.9 L 500.9,210.0 L 499.4,208.4 L 494.6,208.6 L 494.0,208.0 L 493.4,205.0 L 491.6,203.8 L 484.3,202.6 L 480.3,199.8 L 477.9,200.4 L 472.1,200.6 L 468.8,202.4 L 466.2,202.4 L 464.8,203.0 L 463.6,204.6 L 462.8,207.2 L 461.8,208.2 L 458.0,208.2 L 455.8,209.0 L 453.5,211.7 L 450.9,213.3 L 450.5,215.3 L 448.3,215.3 L 444.3,212.5 L 441.9,211.9 L 440.6,207.6 L 439.0,206.0 L 436.0,204.4 L 434.8,203.0 L 434.8,199.6 L 432.8,197.4 L 433.0,193.3 L 432.6,192.1 L 431.6,191.1 L 429.4,190.7 L 427.6,189.5 L 426.8,188.3 L 426.0,184.7 L 424.7,182.9 L 423.1,182.3 L 420.1,182.3 L 419.3,181.7 L 419.3,180.0 L 420.3,177.6 L 419.3,175.8 L 415.7,175.0 L 413.5,172.4 L 410.8,171.2 L 404.4,170.2 L 403.4,171.0 L 401.2,171.0 L 395.9,165.8 L 391.3,166.0 L 390.5,163.5 L 388.9,162.3 L 385.9,162.3 L 382.9,163.9 L 381.0,163.9 L 379.6,161.3 L 376.2,160.5 L 375.4,159.7 L 374.8,157.7 L 371.8,155.5 L 372.2,151.5 L 371.4,149.6 L 370.0,148.2 L 368.2,147.4 L 366.3,148.2 L 364.7,148.2 L 363.9,145.8 L 361.7,144.8 L 360.5,143.6 L 355.7,136.4 L 354.7,135.9 L 353.1,135.9 L 351.9,136.6 L 350.4,136.6 L 349.4,135.7 L 345.8,134.1 L 343.6,131.5 L 341.8,130.5 L 331.5,126.9 L 329.5,125.7 L 324.5,125.9 L 324.3,123.3 L 325.9,119.4 L 325.7,117.0 L 323.9,114.6 L 321.2,113.4 L 319.6,111.6 L 318.6,109.4 L 318.8,101.1 L 317.4,98.7 L 315.6,97.3 L 313.4,96.9 L 308.4,99.3 L 305.9,99.3 L 302.9,96.9 L 301.1,97.7 L 299.3,97.7 L 294.7,95.1 L 287.0,94.3 L 282.4,91.5 L 274.9,88.4 L 273.5,88.4 L 272.1,90.6 L 268.3,90.2 L 267.5,91.0 L 266.5,93.5 L 265.1,94.9 L 263.1,94.7 L 260.6,92.3 L 258.0,91.0 L 255.4,90.8 L 253.4,92.7 L 253.4,105.9 L 252.6,111.2 L 251.6,113.4 L 248.4,116.2 L 243.9,117.0 L 241.7,117.8 L 240.9,118.6 L 240.7,120.4 L 243.3,123.5 L 243.3,125.7 L 242.1,127.7 L 241.9,129.3 L 236.1,131.1 L 232.4,131.5 L 229.6,128.7 L 229.6,127.1 L 230.4,125.3 L 228.0,121.9 L 227.4,118.2 L 223.2,113.0 L 223.2,111.0 L 222.6,110.4 L 222.8,107.0 L 219.0,104.9 L 213.9,104.7 L 213.7,103.5 L 211.9,101.9 L 208.7,101.1 L 208.1,99.9 L 207.1,99.3 L 204.9,99.3 L 204.1,98.5 L 202.9,98.3 L 201.6,96.7 L 200.6,94.5 L 196.0,89.8 L 193.6,89.2 L 191.6,87.0 L 189.2,86.4 L 186.7,84.0 L 183.5,84.2 L 181.7,85.8 L 180.1,86.2 Z';
const LAYOUT = {
  apihimal: [169, 159],
  dadeldhura: [183, 200],
  mahendranagar: [147, 235],
  dhangadhi: [186, 262],
  bardiya: [265, 294],
  kaligandaki: [463, 253],
  baglung: [452, 305],
  pokhara: [487, 311],
  tansen: [448, 346],
  butwal: [440, 363],
  lumbini: [424, 385],
  gorkha: [545, 332],
  chitwan: [527, 365],
  kathmandu_x: [606, 362],
  dhulikhel: [627, 371],
  panchkhal: [633, 365],
  janakpur: [660, 461],
  himalaya: [716, 355],
};
const ICON = {
  baglung: 'forest', chitwan: 'wheat', kathmandu_x: 'city', kaligandaki: 'mountain', himalaya: 'mountain', dhulikhel: 'sunrise', janakpur: 'temple', lumbini: 'wheel',
  butwal: 'motorbike', tansen: 'bolt', gorkha: 'bowl', pokhara: 'boat', dhangadhi: 'rain', bardiya: 'forest', apihimal: 'backpack', panchkhal: 'basket', mahendranagar: 'deer', dadeldhura: 'mountain',
};
let LAST_I = ROUTE.indexOf('kathmandu_x');

// decorations
const MTNS = [[200, 232, 1], [330, 208, 1.2], [470, 212, 1.1], [539, 266, 1.2], [587, 278, 1.1], [578, 296, 0.95], [262, 248, 0.8], [520, 258, 0.85]];
const TREES = [[290, 340], [345, 363], [262, 322], [382, 384], [520, 398], [600, 380], [680, 402], [277, 335], [560, 350], [640, 362], [700, 384], [243, 301], [322, 332], [492, 342], [612, 332], [276, 334], [720, 362], [400, 332], [560, 402], [371, 369], [470, 380]];
const HOUSES = [[620, 366], [645, 372], [600, 360]];
const FLAGS = [[632, 307], [462, 252]];

function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}
const Tree = (x, y, s = 1, k = 0) => (
  <g key={`t${x}${y}`} transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="0" cy="2" rx="11" ry="3.5" fill="rgba(0,0,0,.12)" />
    <rect x="-2.5" y="-6" width="5" height="10" rx="2" fill="#7a5a32" />
    <path d="M 0,-30 L 12,-4 L -12,-4 Z" fill={k ? '#3f8f3a' : '#46a046'} />
    <path d="M 0,-38 L 9,-14 L -9,-14 Z" fill={k ? '#4fa148' : '#5cb255'} />
  </g>
);
const Mtn = (x, y, s) => (
  <g key={`m${x}${y}`} transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M -70,40 L 0,-72 L 70,40 Z" fill="#8c98a6" />
    <path d="M -34,40 L 0,-72 L 34,40 Z" fill="#9fabb8" opacity=".6" />
    <path d="M -22,-26 L 0,-72 L 22,-26 L 11,-34 L 0,-26 L -11,-34 Z" fill="#fff" />
  </g>
);

export default function NepalQuestMap({ onExplorer, onMission }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const L = (o) => (lang === 'ne' ? o.ne : o.en);
  const byId = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));
  const nodes = ROUTE.map((id) => byId[id]).filter(Boolean);

  const [curI, setCurI] = useState(LAST_I);
  const [hover, setHover] = useState(null);
  const [toast, setToast] = useState(null);
  const [walking, setWalking] = useState(false);
  const charRef = useRef(null), bodyRef = useRef(null), legARef = useRef(null), legBRef = useRef(null);
  const posRef = useRef(LAYOUT[ROUTE[LAST_I]]);
  const faceRef = useRef(1);
  const animRef = useRef(null);
  const walkingRef = useRef(false);
  const stageRef = useRef(null);
  // anime.js — staggered reveal of the journey pins (opacity only, so their transforms stay intact)
  useLayoutEffect(() => {
    const pins = stageRef.current ? stageRef.current.querySelectorAll('.nd') : [];
    if (pins.length) animate(pins, { opacity: [0, 1], duration: 460, delay: stagger(60), ease: 'out(2)' });
  }, []);

  const place = (x, y, dir, bob, swing) => {
    if (charRef.current) charRef.current.setAttribute('transform', `translate(${x} ${y}) scale(${dir} 1)`);
    if (bodyRef.current) bodyRef.current.setAttribute('transform', `translate(0 ${-bob})`);
    if (legARef.current) legARef.current.setAttribute('transform', `rotate(${swing} 0 -10)`);
    if (legBRef.current) legBRef.current.setAttribute('transform', `rotate(${-swing} 0 -10)`);
  };
  useEffect(() => {
    let raf = 0, last = performance.now(), idle = 0, phase = 0;
    const p0 = posRef.current; place(p0[0], p0[1], faceRef.current, 1, 0);
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05;
      const a = animRef.current;
      if (a) {
        phase += dt * 10; let d = a.speed * dt;
        while (a.seg < a.pts.length - 1 && d > 0) { const s0 = a.pts[a.seg], s1 = a.pts[a.seg + 1]; const len = Math.hypot(s1[0] - s0[0], s1[1] - s0[1]) || 0.001; const rem = len - a.segDist; if (d < rem) { a.segDist += d; d = 0; } else { d -= rem; a.seg++; a.segDist = 0; } }
        if (a.seg >= a.pts.length - 1) { const lp = a.pts[a.pts.length - 1]; posRef.current = lp; place(lp[0], lp[1], faceRef.current, 1, 0); animRef.current = null; walkingRef.current = false; setWalking(false); LAST_I = a.targetI; setCurI(a.targetI); setTimeout(a.onDone, 260); }
        else { const s0 = a.pts[a.seg], s1 = a.pts[a.seg + 1]; const t = a.segDist / (Math.hypot(s1[0] - s0[0], s1[1] - s0[1]) || 0.001); const x = s0[0] + (s1[0] - s0[0]) * t, y = s0[1] + (s1[1] - s0[1]) * t; const dir = (s1[0] - s0[0]) >= 0 ? 1 : -1; faceRef.current = dir; posRef.current = [x, y]; place(x, y, dir, Math.abs(Math.sin(phase)) * 2.4 + 0.5, Math.sin(phase) * 20); }
      } else { idle += dt; const p = posRef.current; place(p[0], p[1], faceRef.current, Math.sin(idle * 2) * 0.8 + 1, 0); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const open = (loc) => { if (loc.kind === 'explorer') onExplorer(loc.level); else onMission(loc.missionId); };
  const go = (id, idx) => {
    if (walkingRef.current) return;
    const loc = byId[id];
    if (!loc.ready) { setToast(L(loc)); setTimeout(() => setToast(null), 1700); return; }
    if (idx === curI) { open(loc); return; }
    const a = Math.min(curI, idx), b = Math.max(curI, idx);
    let pts = ROUTE.slice(a, b + 1).map((rid) => LAYOUT[rid]);
    if (idx < curI) pts = pts.reverse();
    walkingRef.current = true; setWalking(true); setHover(null);
    animRef.current = { pts, seg: 0, segDist: 0, speed: 340, targetI: idx, onDone: () => open(loc) };
  };
  const toggleFullscreen = () => { const el = stageRef.current; if (!el) return; const fs = document.fullscreenElement || document.webkitFullscreenElement; if (!fs) { const r = el.requestFullscreen || el.webkitRequestFullscreen; if (r) r.call(el); } else { const x = document.exitFullscreen || document.webkitExitFullscreen; if (x) x.call(document); } };

  const pathD = smoothPath(ROUTE.map((id) => LAYOUT[id]));
  const hovered = hover ? byId[hover] : null;

  return (
    <div className="fade-in" style={{ flex: '1 1 0%', minHeight: 440, position: 'relative', padding: '8px 10px 10px', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div ref={stageRef} className="stage" style={{ position: 'absolute', inset: '8px 10px 10px', height: 'auto', borderRadius: 18, overflow: 'hidden', boxShadow: '0 18px 48px rgba(20,40,28,.22)', background: 'linear-gradient(180deg,#89cff0 0%,#bfe6f4 46%,#e2f1e8 100%)' }}>
        <style>{`
          .qmap .trail-c{ stroke:#fff; stroke-width:3; stroke-dasharray:1 16; stroke-linecap:round; animation:qm 1.1s linear infinite; }
          @keyframes qm{ to{ stroke-dashoffset:-17; } }
          .qmap .nd{ cursor:pointer; } .qmap .nd.lock{ cursor:not-allowed; }
          .qmap .pr{ transform-box:fill-box; transform-origin:center; animation:qp 1.9s ease-out infinite; }
          @keyframes qp{ 0%{ transform:scale(1); opacity:.5 } 70%,100%{ transform:scale(2.1); opacity:0 } }
        `}</style>
        <svg className="qmap" viewBox="0 0 1000 580" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="qbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a8dcd5" /><stop offset="22%" stopColor="#c9e6cf" /><stop offset="40%" stopColor="#9ec57e" /><stop offset="100%" stopColor="#79a857" /></linearGradient>
            <linearGradient id="qfr" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#5a3d22" /><stop offset="100%" stopColor="#3c2914" /></linearGradient>
            <filter id="qsh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#14361f" floodOpacity="0.3" /></filter>
            <filter id="qnd" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#000" floodOpacity="0.32" /></filter>
            <clipPath id="qnepal"><path d={NEPAL_D} /></clipPath>
          </defs>

          {/* surrounding land / haze (outside Nepal) */}
          <rect x="0" y="0" width="1000" height="580" fill="#cfe0e6" />
          <circle cx="905" cy="62" r="26" fill="#ffe07a" /><circle cx="905" cy="62" r="34" fill="#ffe07a" opacity=".25" />
          <g fill="#fff" opacity=".85"><ellipse cx="160" cy="70" rx="34" ry="13" /><ellipse cx="195" cy="64" rx="22" ry="11" /><ellipse cx="470" cy="56" rx="30" ry="12" /><ellipse cx="500" cy="62" rx="20" ry="9" /></g>
          {/* Nepal landmass — soft shadow + flat cel fill (hand-inked outline drawn above the scenery) */}
          <path d={NEPAL_D} fill="#33502a" opacity="0.18" transform="translate(5,8)" />
          <path d={NEPAL_D} fill="url(#qbg)" />
          {/* scenery, clipped to the country's borders */}
          <g clipPath="url(#qnepal)">
            {MTNS.map(([x, y, s]) => Mtn(x, y, s))}
            <path d="M 463,255 Q 452,308 458,348 Q 466,388 442,402" fill="none" stroke="#5bb8e6" strokeWidth="9" strokeLinecap="round" opacity=".9" />
            <path d="M 463,255 Q 452,308 458,348 Q 466,388 442,402" fill="none" stroke="#9fdcf3" strokeWidth="3.5" strokeLinecap="round" opacity=".7" />
            {TREES.map(([x, y], i) => Tree(x, y, 0.9 + (i % 3) * 0.12, i % 2))}
            {HOUSES.map(([x, y], i) => (
              <g key={`h${i}`} transform={`translate(${x} ${y})`}><rect x="-11" y="-6" width="22" height="14" fill="#efe2c8" stroke="#cdbf9a" /><path d="M -13,-6 L 0,-18 L 13,-6 Z" fill="#d2603f" /><rect x="-3" y="-1" width="6" height="9" fill="#8a5a2b" /></g>
            ))}
            {FLAGS.map(([x, y], i) => (
              <g key={`f${i}`}><line x1={x} y1={y} x2={x + 46} y2={y + 8} stroke="#7a6a4a" strokeWidth="1.5" />{[0, 1, 2, 3, 4].map((k) => <rect key={k} x={x + 4 + k * 8} y={y + 1 + k * 1.6} width="6" height="8" fill={['#e23c3c', '#3a78c2', '#ffd23f', '#2f9e44', '#fff'][k]} />)}</g>
            ))}
          </g>
          {/* bold hand-inked border + inner highlight line (hand-drawn look) */}
          <path d={NEPAL_D} fill="none" stroke="#26331c" strokeWidth="5.5" strokeLinejoin="round" strokeLinecap="round" />
          <path d={NEPAL_D} fill="none" stroke="#bfe0a0" strokeWidth="1.6" strokeLinejoin="round" opacity="0.5" />
          {/* country label */}
          <text x="500" y="540" fontFamily="'Patrick Hand', cursive" fontSize="34" fontWeight="700" fill="#3c5a32" textAnchor="middle" opacity="0.5" letterSpacing="6">NEPAL</text>

          {/* the trail connecting all the locations */}
          <path d={pathD} fill="none" stroke="#2b3a24" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
          <path d={pathD} fill="none" stroke="#c79a52" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" filter="url(#qsh)" />
          <path d={pathD} fill="none" stroke="#e3c486" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
          <path className="trail-c" d={pathD} fill="none" />

          {/* START / FINISH banners */}
          <g transform="translate(225,144)"><rect x="-34" y="-46" width="68" height="20" rx="4" fill="#e23c3c" /><text x="0" y="-32" fontSize="12" fontWeight="800" fill="#fff" textAnchor="middle">START</text></g>
          <g transform="translate(716,355)"><rect x="-32" y="-48" width="64" height="20" rx="4" fill="#2f9e44" /><text x="0" y="-34" fontSize="11" fontWeight="800" fill="#fff" textAnchor="middle">FINISH</text></g>

          {/* nodes */}
          {ROUTE.map((id, i) => {
            const n = byId[id]; if (!n) return null; const [x, y] = LAYOUT[id];
            const color = !n.ready ? '#9aa0a6' : n.kind === 'explorer' ? '#2f9e44' : '#e8821e';
            return (
              <g key={id} className={`nd${n.ready ? '' : ' lock'}`} transform={`translate(${x} ${y})`} onClick={() => go(id, i)} onMouseEnter={() => setHover(id)} onMouseLeave={() => setHover((h) => (h === id ? null : h))}>
                {n.ready && <circle className="pr" r="17" fill={color} />}
                {i === curI && <circle r="23" fill="none" stroke="#ffd54a" strokeWidth="3" />}
                <circle r="16" fill="#fff" stroke={color} strokeWidth="4" filter="url(#qnd)" />
                <g transform="translate(-11 -11)" style={{ color, pointerEvents: 'none' }}>{n.ready ? <Icon name={ICON[id] || 'pin'} size={22} /> : <Icon name="lock" size={20} />}</g>
              </g>
            );
          })}

          {/* walking guide (eco student) */}
          <g ref={charRef}>
            <ellipse cx="0" cy="3" rx="10" ry="3.5" fill="rgba(0,0,0,.22)" />
            <g ref={bodyRef}>
              <g ref={legARef}><rect x="-5" y="-10" width="4.2" height="11" rx="2" fill="#33506e" /></g>
              <g ref={legBRef}><rect x="0.8" y="-10" width="4.2" height="11" rx="2" fill="#2b4560" /></g>
              <rect x="-7.5" y="-25" width="15" height="16" rx="6" fill="#2f9e44" />
              <rect x="-10" y="-23" width="4.5" height="11" rx="2" fill="#c0552f" />
              <circle cx="0" cy="-30" r="7" fill="#f3c79a" stroke="#e0b184" strokeWidth="1" />
              <circle cx="-2.5" cy="-30.5" r="1.1" fill="#3a2a1a" /><circle cx="2.5" cy="-30.5" r="1.1" fill="#3a2a1a" />
              <path d="M -7.5,-34 Q 0,-41 7.5,-34 Z" fill="#1f7a33" /><path d="M 5,-37 q 6,-3 9,2 q -6,2 -9,-2 Z" fill="#46c15a" />
            </g>
          </g>
        </svg>

        {hovered && !walking && (
          <div style={{ position: 'absolute', left: 12, bottom: 12, maxWidth: 280, background: 'rgba(255,255,255,.95)', borderRadius: 12, padding: '8px 12px', boxShadow: '0 6px 18px rgba(0,0,0,.18)' }}>
            <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name={ICON[hovered.id] || 'pin'} size={17} /> {L(hovered)}</div>
            <div className="muted" style={{ fontWeight: 600, fontSize: '.8rem' }}>{lang === 'ne' ? hovered.note_ne : hovered.note_en} · {hovered.kind === 'explorer' ? tt('Explore', 'अन्वेषण') : tt('Mission', 'मिसन')}{hovered.ready ? '' : ` · ${tt('coming soon', 'चाँडै')}`}</div>
          </div>
        )}
        <div style={{ position: 'absolute', top: 12, left: 14, zIndex: 5, display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', maxWidth: 'calc(100% - 96px)' }}>
          <span className="pill" style={{ boxShadow: '0 4px 14px rgba(0,0,0,.18)' }}><Icon name="compass" size={16} /> {tt('Nepal Quest Map', 'नेपाल यात्रा नक्सा')}</span>
          <span style={{ fontWeight: 700, color: '#15301f', background: 'rgba(255,255,255,.8)', borderRadius: 9, padding: '5px 11px', fontSize: '.84rem', boxShadow: '0 3px 10px rgba(0,0,0,.12)' }}>{tt('Tap a stop to walk the trail and open the level.', 'कुनै ठाउँ थिच्नुहोस् — बाटो हिँडेर तह खुल्छ।')}</span>
        </div>
        <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ background: 'rgba(255,255,255,.92)', borderRadius: 20, padding: '5px 11px', fontSize: '.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#2f9e44', display: 'inline-block' }} /> {tt('Explore', 'अन्वेषण')}</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#e8821e', display: 'inline-block' }} /> {tt('Mission', 'मिसन')}</span></span>
          <button onClick={toggleFullscreen} title={tt('Fullscreen', 'पूर्ण स्क्रिन')} style={{ border: 'none', borderRadius: 8, padding: '6px 9px', fontWeight: 800, cursor: 'pointer', background: 'rgba(255,255,255,.92)' }}><Icon name="expand" size={16} /></button>
        </div>
        {walking && <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(47,158,68,.92)', color: '#fff', borderRadius: 20, padding: '5px 12px', fontWeight: 800, fontSize: '.8rem' }}><Icon name="walk" size={15} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} /> {tt('Walking…', 'हिँड्दै…')}</div>}
        {toast && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(20,40,28,.92)', color: '#fff', borderRadius: 12, padding: '10px 18px', fontWeight: 700 }}><Icon name="lock" size={15} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }} /> {toast} — {tt('coming soon', 'चाँडै आउँदै')}</div>}
      </div>
    </div>
  );
}
