const Coupon = require('../Models/couponds');
const User = require('../Models/user');

// Create coupon
exports.createcoupondsdatabyds = async (req, res) => {
  try {
    const {
      name,
      user,
      colid,
      couponCode,
      couponName,
      description,
      discountType,
      discountValue,
      maximumDiscount,
      minimumOrderAmount,
      validFrom,
      validTo,
      usageLimit,
      perUserLimit,
      applicablePaymentTypes,
      applicableCourses,
      applicableDepartments,
      applicableSemesters,
      applicableProgramcodes,
      eligibleStudents,
      eligibleCategories,
      firstTimeUserOnly,
      canStackWithOtherOffers,
      termsAndConditions,
      isPublic,
      promotionMessage,
      createdBy,
      notes
    } = req.body;

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }

    const newCoupon = new Coupon({
      name,
      user,
      colid,
      couponCode: couponCode.toUpperCase(),
      couponName,
      description,
      discountType,
      discountValue,
      maximumDiscount,
      minimumOrderAmount: minimumOrderAmount || 0,
      validFrom: validFrom || new Date(),
      validTo,
      usageLimit,
      usageCount: 0,
      perUserLimit: perUserLimit || 1,
      applicablePaymentTypes: applicablePaymentTypes || [],
      applicableCourses: applicableCourses || [],
      applicableDepartments: applicableDepartments || [],
      applicableSemesters: applicableSemesters || [],
      applicableProgramcodes: applicableProgramcodes || [],
      eligibleStudents: eligibleStudents || [],
      eligibleCategories: eligibleCategories || [],
      firstTimeUserOnly: firstTimeUserOnly || false,
      canStackWithOtherOffers: canStackWithOtherOffers || false,
      termsAndConditions,
      isPublic: isPublic !== undefined ? isPublic : true,
      promotionMessage,
      isActive: true,
      createdBy,
      notes
    });

    await newCoupon.save();

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: newCoupon
    });

  } catch (error) {
    console.error('Error in createcoupondsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create coupon',
      error: error.message
    });
  }
};

// Get coupon by code
exports.getcoupondsdatabyds = async (req, res) => {
  try {
    const { couponCode, colid } = req.query;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: 'couponCode is required'
      });
    }

    const query = { couponCode: couponCode.toUpperCase() };
    if (colid) {
      query.colid = colid;
    }

    const coupon = await Coupon.findOne(query);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      data: coupon
    });

  } catch (error) {
    console.error('Error in getcoupondsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupon',
      error: error.message
    });
  }
};

// Get all coupons by colid
exports.getallcoupondsdatabyds = async (req, res) => {
  try {
    const { colid, isActive } = req.query;

    if (!colid) {
      return res.status(400).json({
        success: false,
        message: 'colid is required'
      });
    }

    const query = { colid };
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const coupons = await Coupon.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons
    });

  } catch (error) {
    console.error('Error in getallcoupondsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupons',
      error: error.message
    });
  }
};

// Get valid coupons for institution
exports.getvalidcoupondsdatabyds = async (req, res) => {
  try {
    const { colid, paymentType } = req.query;

    if (!colid) {
      return res.status(400).json({
        success: false,
        message: 'colid is required'
      });
    }

    const coupons = await Coupon.findValidCoupons(parseInt(colid), paymentType);

    res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons
    });

  } catch (error) {
    console.error('Error in getvalidcoupondsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch valid coupons',
      error: error.message
    });
  }
};

// Validate coupon - Updated
exports.validatecoupondsdatabyds = async (req, res) => {
  try {
    const { couponCode, colid, regno, orderAmount, paymentType, course, department, semester, programcode, category } = req.query;

    if (!couponCode || !colid || !regno || !orderAmount) {
      return res.status(400).json({
        success: false,
        message: 'couponCode, colid, regno and orderAmount are required'
      });
    }

    const coupon = await Coupon.findOne({ 
      couponCode: couponCode.toUpperCase(), 
      colid: parseInt(colid) 
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    const studentInfo = {
      course,
      department,
      semester,
      programcode,
      category
    };

    // Validate coupon using regno
    const validation = coupon.validateCoupon(
      regno,
      parseFloat(orderAmount),
      paymentType,
      studentInfo
    );

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // Calculate discount
    const discount = coupon.calculateDiscount(parseFloat(orderAmount));

    res.status(200).json({
      success: true,
      message: 'Coupon is valid',
      data: {
        couponCode: coupon.couponCode,
        couponName: coupon.couponName,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount,
        finalAmount: parseFloat(orderAmount) - discount
      }
    });

  } catch (error) {
    console.error('Error in validatecoupondsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate coupon',
      error: error.message
    });
  }
};
// Update coupon
exports.updatecoupondsdatabyds = async (req, res) => {
  try {
    const { couponCode } = req.query;
    const updateData = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: 'couponCode is required'
      });
    }

    // Don't allow updating couponCode or usageCount directly
    delete updateData.couponCode;
    delete updateData.usageCount;
    delete updateData.usageHistory;

    const updatedCoupon = await Coupon.findOneAndUpdate(
      { couponCode: couponCode.toUpperCase() },
      { ...updateData, updatedBy: updateData.updatedBy },
      { new: true, runValidators: true }
    );

    if (!updatedCoupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: updatedCoupon
    });

  } catch (error) {
    console.error('Error in updatecoupondsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update coupon',
      error: error.message
    });
  }
};

// Delete (deactivate) coupon
exports.deletecoupondsdatabyds = async (req, res) => {
  try {
    const { couponCode } = req.query;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: 'couponCode is required'
      });
    }

    const coupon = await Coupon.findOneAndUpdate(
      { couponCode: couponCode.toUpperCase() },
      { isActive: false },
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Coupon deactivated successfully',
      data: coupon
    });

  } catch (error) {
    console.error('Error in deletecoupondsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate coupon',
      error: error.message
    });
  }
};

// Toggle coupon active status
exports.togglecoupondsdatabyds = async (req, res) => {
  try {
    const { couponCode } = req.query;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: 'couponCode is required'
      });
    }

    const coupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
      data: coupon
    });

  } catch (error) {
    console.error('Error in togglecoupondsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle coupon status',
      error: error.message
    });
  }
};

// Get coupon usage statistics - Updated
exports.getcouponstatsdsdatabyds = async (req, res) => {
  try {
    const { couponCode } = req.query;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: 'couponCode is required'
      });
    }

    const coupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    const totalDiscountGiven = coupon.usageHistory.reduce(
      (sum, usage) => sum + (usage.discountAmount || 0), 
      0
    );

    res.status(200).json({
      success: true,
      data: {
        couponCode: coupon.couponCode,
        couponName: coupon.couponName,
        usageCount: coupon.usageCount,
        usageLimit: coupon.usageLimit,
        remainingUsage: coupon.usageLimit ? coupon.usageLimit - coupon.usageCount : 'Unlimited',
        totalDiscountGiven,
        usageHistory: coupon.usageHistory
      }
    });

  } catch (error) {
    console.error('Error in getcouponstatsdsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupon statistics',
      error: error.message
    });
  }
};